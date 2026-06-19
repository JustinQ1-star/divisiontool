const entriesEl = document.getElementById('entries');
const btnAdd = document.getElementById('btnAdd');
const btnConfirm = document.getElementById('btnConfirm');
const resultsEl = document.getElementById('results');

let entryCount = 0;

// ---- add entry row ----
function addEntry() {
  entryCount++;
  const row = document.createElement('div');
  row.className = 'entry-row';
  row.dataset.id = entryCount;
  row.innerHTML = `
    <input class="input-name" type="text" placeholder="姓名（如：张三）" autocomplete="off">
    <input class="input-amount" type="number" placeholder="金额" min="0" step="0.01">
    <button class="btn-delete" title="删除">&times;</button>
  `;
  row.querySelector('.btn-delete').addEventListener('click', () => {
    row.remove();
  });
  entriesEl.appendChild(row);
  row.querySelector('.input-name').focus();
}

btnAdd.addEventListener('click', addEntry);

// ---- settlement ----
btnConfirm.addEventListener('click', () => {
  // 1. 收集数据
  const rows = document.querySelectorAll('.entry-row');
  const people = [];

  for (const row of rows) {
    const name = row.querySelector('.input-name').value.trim();
    const amount = parseFloat(row.querySelector('.input-amount').value);

    if (!name) continue;

    if (isNaN(amount) || amount < 0) {
      showError('请为「' + name + '」输入有效的金额');
      return;
    }

    people.push({ name, amount });
  }

  if (people.length < 2) {
    showError('请至少添加两人');
    return;
  }

  if (people.some(p => p.amount < 0)) {
    showError('金额不能为负数');
    return;
  }

  // 2. 计算（不接触 DOM）
  const result = settle(people);

  // 3. 渲染结果
  renderResults(result, people);
});

function showError(msg) {
  resultsEl.innerHTML = '<div class="error-msg">' + msg + '</div>';
  resultsEl.hidden = false;
}

// ---- settlement algorithm ----
function settle(people) {
  const total = people.reduce((s, p) => s + p.amount, 0);
  const avg = total / people.length;

  // net > 0 => 应收款; net < 0 => 应付款
  const balance = people.map(p => {
    const net = +(p.amount - avg).toFixed(2);
    // 消除 -0
    return { name: p.name, net: net === 0 ? 0 : net };
  });

  // 分离付款方和收款方
  const payers = balance.filter(b => b.net < 0).map(b => ({ name: b.name, net: -b.net }));
  const receivers = balance.filter(b => b.net > 0);

  payers.sort((a, b) => b.net - a.net);
  receivers.sort((a, b) => b.net - a.net);

  // 贪心匹配，最少转账次数
  const transfers = [];
  let i = 0, j = 0;

  while (i < payers.length && j < receivers.length) {
    const payerRemain = Math.round(payers[i].net * 100) / 100;
    const receiverRemain = Math.round(receivers[j].net * 100) / 100;

    if (payerRemain < 0.001) { i++; continue; }
    if (receiverRemain < 0.001) { j++; continue; }

    const amount = Math.min(payerRemain, receiverRemain);
    const amt = Math.round(amount * 100) / 100;

    if (amt > 0) {
      transfers.push({ from: payers[i].name, to: receivers[j].name, amount: amt });
    }

    payers[i].net = Math.round((payers[i].net - amt) * 100) / 100;
    receivers[j].net = Math.round((receivers[j].net - amt) * 100) / 100;

    if (payers[i].net < 0.001) i++;
    if (receivers[j].net < 0.001) j++;
  }

  return { transfers, balance };
}

// ---- render results ----
function renderResults(result, people) {
  const { transfers, balance } = result;
  const total = people.reduce((s, p) => s + p.amount, 0);
  const avg = total / people.length;

  let html = '<h2>结算结果</h2>';

  for (const b of balance) {
    if (b.net > 0) {
      html += '<div class="result-item receive">' +
        '<span>' + b.name + '</span>' +
        '<span class="amount">应收取 ' + b.net.toFixed(2) + ' 元</span></div>';
    } else if (b.net < 0) {
      html += '<div class="result-item pay">' +
        '<span>' + b.name + '</span>' +
        '<span class="amount">应付给 ' + (-b.net).toFixed(2) + ' 元</span></div>';
    } else {
      html += '<div class="result-item balanced">' +
        '<span>' + b.name + '</span>' +
        '<span class="amount">收支平衡</span></div>';
    }
  }

  // 转账明细
  if (transfers.length > 0) {
    html += '<div class="transfer-section"><h3>转账方案（最少笔数）</h3>';
    for (const t of transfers) {
      html += '<div class="transfer-item">' +
        '<span>' + t.from + '</span>' +
        '<span class="arrow"> → </span>' +
        '<span>' + t.to + '</span>' +
        '<span class="transfer-amount">' + t.amount.toFixed(2) + ' 元</span></div>';
    }
    html += '</div>';
  }

  resultsEl.innerHTML = html;
  resultsEl.hidden = false;

  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
