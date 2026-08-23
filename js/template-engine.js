const DEFAULT_TEMPLATE = `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;margin:28px;color:#111}.head{text-align:center;border-bottom:2px solid #111;padding-bottom:10px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:15px 0}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #333;padding:6px;font-size:11px}th{background:#eee}.sign{display:grid;grid-template-columns:repeat(4,1fr);gap:25px;margin-top:55px;text-align:center}.sign div{border-top:1px solid #333;padding-top:6px;font-size:11px}</style></head><body>
<div class="head"><h1>{{company_name}}</h1><h2>GATE PASS</h2></div>
<div class="meta"><div><b>Gate Pass:</b> {{gate_pass_no}}</div><div><b>Date:</b> {{date}}</div><div><b>Type:</b> {{type}}</div><div><b>Department:</b> {{department}}</div><div><b>Employee:</b> {{employee_name}} ({{employee_id}})</div><div><b>Vehicle:</b> {{vehicle_no}}</div><div><b>Destination:</b> {{destination}}</div><div><b>Reference:</b> {{reference_no}}</div></div>
<table><thead><tr><th>SL</th><th>Item Code</th><th>Old Part No.</th><th>New Part No.</th><th>Description</th><th>Unit</th><th>Qty</th><th>Serial/Asset</th><th>Condition</th></tr></thead><tbody>{{items}}</tbody></table>
<p><b>Total Quantity:</b> {{total_quantity}}</p><p><b>Remarks:</b> {{remarks}}</p>
<div class="sign"><div>Prepared By<br>{{prepared_by}}</div><div>Checked By<br>{{checked_by}}</div><div>Approved By<br>{{approved_by}}</div><div>Received By<br>{{received_by}}</div></div>
</body></html>`;
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function itemRowsHTML(items){
 return items.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.itemCode)}</td><td>${esc(x.oldPart)}</td><td>${esc(x.newPart)}</td><td>${esc(x.description)}</td><td>${esc(x.unit)}</td><td>${esc(x.quantity)}</td><td>${esc(x.serialAsset)}</td><td>${esc(x.condition)}</td></tr>`).join("");
}
function renderTemplate(html,p){
 const map={company_name:db.settings.companyName,gate_pass_no:p.gatePassNo,date:p.date,time:p.time,type:p.type,department:p.department,warehouse:p.warehouse,employee_name:p.employeeName,employee_id:p.employeeId,designation:p.designation,contact:p.contact,vehicle_no:p.vehicleNo,driver_name:p.driverName,destination:p.destination,reference_no:p.referenceNo,po_no:p.poNo,remarks:p.remarks,prepared_by:p.preparedBy,checked_by:p.checkedBy,approved_by:p.approvedBy,received_by:p.receivedBy,total_quantity:p.items.reduce((a,x)=>a+Number(x.quantity||0),0),items:itemRowsHTML(p.items)};
 return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g,(m,k)=>map[k]??m);
}
