let editingPassId=null, currentTemplateId=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
document.addEventListener("DOMContentLoaded",init);
function init(){
 if(!db.templates.length){db.templates=[{id:"TPL-STD",name:"Standard A4 Gate Pass",html:DEFAULT_TEMPLATE,default:true}];saveDB()}
 bindNav(); bindEvents(); refreshAll(); newPass();
}
function bindNav(){
 $$(".nav-btn[data-page], [data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
}
function showPage(page){
 $$(".page").forEach(x=>x.classList.remove("active"));$(`#page-${page}`).classList.add("active");
 $$(".nav-btn[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
 const names={dashboard:"Dashboard",gatepasses:"Gate Passes", "new-pass":"New Gate Pass",inventory:"Inventory",templates:"Templates",settings:"Settings"};
 $("#pageTitle").textContent=names[page]||"Dashboard";$("#pageSubtitle").textContent=page==="new-pass"?"Create or edit an inventory gate pass":"Inventory and gate pass overview";
 if(innerWidth<721)$("#sidebar").classList.remove("open");
 if(page==="templates")renderTemplates();
 if(page==="inventory")renderInventory();
 if(page==="gatepasses")renderPasses();
}
function bindEvents(){
 $("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
 $("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("gpDark",document.body.classList.contains("dark"))};
 if(localStorage.getItem("gpDark")==="true")document.body.classList.add("dark");
 $("#addItemBtn").onclick=()=>addItemRow();
 $("#clearPassBtn").onclick=()=>newPass();
 $("#previewPassBtn").onclick=()=>previewCurrent();
 $("#passForm").onsubmit=e=>{e.preventDefault();savePass()};
 $("#passSearch").oninput=renderPasses;$("#passStatusFilter").onchange=renderPasses;
 $("#inventorySearch").oninput=renderInventory;
 $("#addInventoryBtn").onclick=()=>inventoryDialog();
 $("#exportCsvBtn").onclick=exportCSV;
 $("#newTemplateBtn").onclick=()=>selectTemplate({id:uid("TPL"),name:"New Template",html:DEFAULT_TEMPLATE});
 $("#saveTemplateBtn").onclick=saveTemplate;
 $("#downloadTemplateBtn").onclick=downloadTemplate;
 $("#importTemplateBtn").onclick=()=>$("#templateFile").click();
 $("#templateFile").onchange=importTemplate;
 $("#templateEditor").oninput=()=>updateTemplatePreview();
 $("#saveSettingsBtn").onclick=saveSettings;
 $("#resetBtn").onclick=resetAll;
 $("#backupBtn").onclick=backupJSON;
 $("#restoreInput").onchange=restoreJSON;
 $("#modalClose").onclick=closeModal;
}
function refreshAll(){renderDashboard();renderTemplates();renderInventory();renderPasses();loadSettings();fillTemplateSelect()}
function renderDashboard(){
 const today=new Date().toISOString().slice(0,10), ps=db.gatepasses;
 $("#statTotal").textContent=ps.length;$("#statToday").textContent=ps.filter(p=>p.date===today).length;$("#statApproved").textContent=ps.filter(p=>p.status==="Approved").length;$("#statInventory").textContent=db.inventory.length;$("#statIssued").textContent=ps.filter(p=>["Issued","Closed"].includes(p.status)).reduce((a,p)=>a+p.items.reduce((q,x)=>q+Number(x.quantity||0),0),0);
 $("#recentPasses").innerHTML=ps.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6).map(p=>`<div class="recent-item"><span><b>${esc(p.gatePassNo)}</b><br>${esc(p.employeeName||"-")}</span><span>${esc(p.status)}</span></div>`).join("")||`<div class="empty">No gate passes yet.</div>`;
 const low=db.inventory.filter(x=>Number(x.stock)<=Number(x.min));$("#lowStock").innerHTML=low.map(x=>`<div class="low-item"><span>${esc(x.itemCode)} — ${esc(x.description)}</span><b>${x.stock}</b></div>`).join("")||`<div class="empty">No low-stock items.</div>`;
}
function newPass(){
 editingPassId=null;$("#passForm").reset();$("#gpNo").value=nextGatePassNo();$("#gpDate").value=new Date().toISOString().slice(0,10);$("#gpTime").value=new Date().toTimeString().slice(0,5);$("#itemRows").innerHTML="";addItemRow();fillTemplateSelect();
}
function addItemRow(data={}){
 const tr=document.createElement("tr");tr.innerHTML=`<td class="sl"></td>
 <td><input name="itemCode" list="inventoryCodes" value="${esc(data.itemCode)}" placeholder="Item code"></td>
 <td><input name="oldPart" value="${esc(data.oldPart)}"></td><td><input name="newPart" value="${esc(data.newPart)}"></td>
 <td><input name="description" value="${esc(data.description)}"></td><td><input name="unit" value="${esc(data.unit||"PCS")}"></td>
 <td><input name="quantity" type="number" min="0" step="any" value="${data.quantity??1}"></td><td><input name="serialAsset" value="${esc(data.serialAsset)}"></td>
 <td><select name="condition"><option ${data.condition==="Good"||!data.condition?"selected":""}>Good</option><option ${data.condition==="Used"?"selected":""}>Used</option><option ${data.condition==="Damaged"?"selected":""}>Damaged</option></select></td>
 <td><button type="button" class="small-btn delete-row">×</button></td>`;
 $("#itemRows").appendChild(tr);tr.querySelector(".delete-row").onclick=()=>{tr.remove();updateTotals()};tr.querySelector('[name=itemCode]').onchange=()=>autofillItem(tr);updateTotals();
}
function autofillItem(tr){const code=tr.querySelector('[name=itemCode]').value.trim();const x=db.inventory.find(i=>i.itemCode===code);if(x){for(const k of ["oldPart","newPart","description","unit"]){const el=tr.querySelector(`[name=${k}]`);if(!el.value)el.value=x[k]||""}}}
function updateTotals(){$$("#itemRows tr").forEach((tr,i)=>tr.querySelector(".sl").textContent=i+1);$("#lineTotal").textContent=$$("#itemRows tr").length;$("#qtyTotal").textContent=$$("#itemRows tr").reduce((a,tr)=>a+Number(tr.querySelector('[name=quantity]').value||0),0)}
document.addEventListener("input",e=>{if(e.target.closest("#itemRows"))updateTotals()});
function formData(){
 const fd=new FormData($("#passForm")), items=$$("#itemRows tr").map(tr=>Object.fromEntries(["itemCode","oldPart","newPart","description","unit","quantity","serialAsset","condition"].map(k=>[k,tr.querySelector(`[name=${k}]`).value])));
 return {...Object.fromEntries(fd.entries()),items,createdAt:new Date().toISOString()};
}
function savePass(){
 const p=formData();if(!p.employeeName.trim()){toast("Employee name is required");return}if(!p.items.length){toast("Add at least one item");return}
 if(editingPassId){const idx=db.gatepasses.findIndex(x=>x.id===editingPassId);p.id=editingPassId;db.gatepasses[idx]=p;logAction("Edited Gate Pass",p.gatePassNo)}else{p.id=uid("GP");db.gatepasses.unshift(p);logAction("Created Gate Pass",p.gatePassNo)}
 saveDB();toast("Gate Pass saved");refreshAll();showPage("gatepasses");
}
function renderPasses(){
 const q=($("#passSearch")?.value||"").toLowerCase(), st=$("#passStatusFilter")?.value||"";
 const rows=db.gatepasses.filter(p=>(!st||p.status===st)&&JSON.stringify(p).toLowerCase().includes(q));
 $("#passesTable").innerHTML=rows.map(p=>`<tr><td><b>${esc(p.gatePassNo)}</b></td><td>${esc(p.date)}</td><td>${esc(p.type)}</td><td>${esc(p.employeeName)}</td><td>${p.items.length}</td><td>${p.items.reduce((a,x)=>a+Number(x.quantity||0),0)}</td><td><span class="status ${esc(p.status)}">${esc(p.status)}</span></td><td><div class="actions"><button class="small-btn" onclick="viewPass('${p.id}')">View</button><button class="small-btn" onclick="editPass('${p.id}')">Edit</button><button class="small-btn" onclick="printPass('${p.id}')">Print</button><button class="small-btn" onclick="deletePass('${p.id}')">Delete</button></div></td></tr>`).join("")||`<tr><td colspan="8" class="empty">No gate passes found.</td></tr>`;
}
function editPass(id){const p=db.gatepasses.find(x=>x.id===id);if(!p)return;editingPassId=id;showPage("new-pass");$("#gpNo").value=p.gatePassNo;for(const [k,v] of Object.entries(p)){const el=$(`#passForm [name="${k}"]`);if(el&&k!=="items"&&k!=="id"&&k!=="createdAt")el.value=v}$("#itemRows").innerHTML="";p.items.forEach(addItemRow);updateTotals()}
function viewPass(id){const p=db.gatepasses.find(x=>x.id===id);if(!p)return;const t=db.templates.find(x=>x.id===p.templateId)||db.templates.find(x=>x.default)||db.templates[0];openModal("Gate Pass Preview","");const fr=document.createElement("iframe");fr.className="preview-frame";fr.srcdoc=renderTemplate(t.html,p);$("#modalBody").appendChild(fr)}
function printPass(id){const p=db.gatepasses.find(x=>x.id===id),t=db.templates.find(x=>x.id===p.templateId)||db.templates.find(x=>x.default)||db.templates[0];const w=window.open("","_blank");w.document.write(renderTemplate(t.html,p));w.document.close();w.onload=()=>w.print()}
function deletePass(id){const p=db.gatepasses.find(x=>x.id===id);if(confirm(`Delete ${p.gatePassNo}?`)){db.gatepasses=db.gatepasses.filter(x=>x.id!==id);logAction("Deleted Gate Pass",p.gatePassNo);saveDB();refreshAll()}}
function fillTemplateSelect(){const el=$("#templateSelect");if(!el)return;el.innerHTML=db.templates.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("")}
function previewCurrent(){const p=formData(),t=db.templates.find(x=>x.id===$("#templateSelect").value)||db.templates[0];openModal("Gate Pass Preview","");const fr=document.createElement("iframe");fr.className="preview-frame";fr.srcdoc=renderTemplate(t.html,p);$("#modalBody").appendChild(fr)}
function renderInventory(){
 const q=($("#inventorySearch")?.value||"").toLowerCase(), rows=db.inventory.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
 $("#inventoryTable").innerHTML=rows.map(x=>`<tr><td>${esc(x.itemCode)}</td><td>${esc(x.oldPart)}</td><td>${esc(x.newPart)}</td><td>${esc(x.description)}</td><td>${esc(x.unit)}</td><td>${x.stock}</td><td>${x.min}</td><td>${esc(x.location)}</td><td><button class="small-btn" onclick="inventoryDialog('${x.id}')">Edit</button><button class="small-btn" onclick="deleteInventory('${x.id}')">Delete</button></td></tr>`).join("")||`<tr><td colspan="9" class="empty">No inventory items.</td></tr>`;
}
function inventoryDialog(id){
 const x=id?db.inventory.find(i=>i.id===id):{};const b=`<div class="form-grid"><label>Item Code<input id="dCode" value="${esc(x.itemCode)}"></label><label>Old Part<input id="dOld" value="${esc(x.oldPart)}"></label><label>New Part<input id="dNew" value="${esc(x.newPart)}"></label><label>Description<input id="dDesc" value="${esc(x.description)}"></label><label>Unit<input id="dUnit" value="${esc(x.unit||"PCS")}"></label><label>Stock<input id="dStock" type="number" value="${x.stock??0}"></label><label>Minimum<input id="dMin" type="number" value="${x.min??0}"></label><label>Location<input id="dLoc" value="${esc(x.location)}"></label></div><div class="form-actions"><button class="btn primary" onclick="saveInventory('${id||""}')">Save</button></div>`;openModal(id?"Edit Inventory":"Add Inventory",b)}
function saveInventory(id){const x={id:id||uid("INV"),itemCode:$("#dCode").value,oldPart:$("#dOld").value,newPart:$("#dNew").value,description:$("#dDesc").value,unit:$("#dUnit").value,stock:Number($("#dStock").value||0),min:Number($("#dMin").value||0),location:$("#dLoc").value};if(id)db.inventory[db.inventory.findIndex(i=>i.id===id)]=x;else db.inventory.push(x);saveDB();closeModal();refreshAll();toast("Inventory saved")}
function deleteInventory(id){if(confirm("Delete inventory item?")){db.inventory=db.inventory.filter(x=>x.id!==id);saveDB();refreshAll()}}
function renderTemplates(){
 $("#templateList").innerHTML=db.templates.map(t=>`<div class="template-list-item ${t.id===currentTemplateId?"active":""}" onclick="selectTemplate('${t.id}')"><span>${esc(t.name)}</span><button class="small-btn" onclick="event.stopPropagation();deleteTemplate('${t.id}')">×</button></div>`).join("");
 if(!currentTemplateId&&db.templates[0])selectTemplate(db.templates[0].id);
}
function selectTemplate(t){
 const x=typeof t==="string"?db.templates.find(a=>a.id===t):t;if(!x)return;currentTemplateId=x.id;$("#templateName").value=x.name;$("#templateEditor").value=x.html;updateTemplatePreview();renderTemplates()
}
function updateTemplatePreview(){const html=$("#templateEditor").value||"";$("#templatePreview").srcdoc=renderTemplate(html,{gatePassNo:"GP-2026-000001",date:new Date().toISOString().slice(0,10),time:"10:30",type:"Material Issue",department:"Store",warehouse:"WH-A",employeeName:"Sample Employee",employeeId:"EMP-001",designation:"Storekeeper",contact:"",vehicleNo:"DHAKA-METRO-XX",driverName:"Driver",destination:"Project Site",referenceNo:"REF-001",poNo:"PO-001",remarks:"Sample preview",preparedBy:"Store",checkedBy:"Manager",approvedBy:"Admin",receivedBy:"Receiver",items:[{itemCode:"ITM-001",oldPart:"12466712",newPart:"ON-001",description:"Bearing Assembly",unit:"PCS",quantity:2,serialAsset:"SN-001",condition:"Good"}]})}
function saveTemplate(){const name=$("#templateName").value.trim()||"Untitled Template",html=$("#templateEditor").value;if(!html.trim()){toast("Template HTML is empty");return}const idx=db.templates.findIndex(t=>t.id===currentTemplateId);if(idx>=0){db.templates[idx].name=name;db.templates[idx].html=html}else{const t={id:uid("TPL"),name,html};db.templates.push(t);currentTemplateId=t.id}saveDB();refreshAll();toast("Template saved")}
function deleteTemplate(id){if(db.templates.length<=1){toast("Keep at least one template");return}if(confirm("Delete template?")){db.templates=db.templates.filter(x=>x.id!==id);currentTemplateId=null;saveDB();renderTemplates()}}
function downloadTemplate(){const blob=new Blob([$("#templateEditor").value],{type:"text/html"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=($("#templateName").value||"gatepass-template")+".html";a.click();URL.revokeObjectURL(a.href)}
function importTemplate(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{selectTemplate({id:uid("TPL"),name:f.name.replace(/\.[^.]+$/,""),html:r.result});toast("Template loaded; click Save to store it")};r.readAsText(f);e.target.value=""}
function loadSettings(){const s=db.settings;$("#sCompanyName").value=s.companyName;$("#sPhone").value=s.phone;$("#sEmail").value=s.email;$("#sAddress").value=s.address;$("#sPrefix").value=s.prefix;$("#sNextNo").value=s.nextNo;$("#sLength").value=s.length}
function saveSettings(){Object.assign(db.settings,{companyName:$("#sCompanyName").value,phone:$("#sPhone").value,email:$("#sEmail").value,address:$("#sAddress").value,prefix:$("#sPrefix").value||"GP",nextNo:Number($("#sNextNo").value)||1,length:Number($("#sLength").value)||6});saveDB();refreshAll();toast("Settings saved")}
function exportCSV(){const head=["Item Code","Old Part","New Part","Description","Unit","Stock","Minimum","Location"];const lines=[head,...db.inventory.map(x=>[x.itemCode,x.oldPart,x.newPart,x.description,x.unit,x.stock,x.min,x.location])].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(","));downloadBlob(lines.join("\n"),"inventory.csv","text/csv")}
function downloadBlob(text,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function backupJSON(){downloadBlob(JSON.stringify(db,null,2),"gatepass-backup.json","application/json")}
function restoreJSON(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.settings||!x.inventory||!x.gatepasses||!x.templates)throw Error();db=x;saveDB();refreshAll();toast("Backup restored")}catch{toast("Invalid backup file")}};r.readAsText(f);e.target.value=""}
function resetAll(){if(confirm("This will delete all local data. Continue?")){localStorage.removeItem(DB_KEY);location.reload()}}
function openModal(title,body){$("#modalTitle").textContent=title;$("#modalBody").innerHTML=body;$("#modal").classList.add("open")}
function closeModal(){$("#modal").classList.remove("open");$("#modalBody").innerHTML=""}
function toast(msg){const n=document.createElement("div");n.className="notice";n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),2200)}
