const DB_KEY="inventoryGatePassDB_v1";
const defaultDB={
  settings:{companyName:"Your Company",phone:"",email:"",address:"",prefix:"GP",nextNo:1,length:6},
  inventory:[
    {id:"I1",itemCode:"ITM-001",oldPart:"12466712",newPart:"ON-001",description:"Bearing Assembly",unit:"PCS",stock:25,min:5,location:"WH-A"},
    {id:"I2",itemCode:"ITM-002",oldPart:"12466713",newPart:"ON-002",description:"Hydraulic Seal",unit:"PCS",stock:8,min:10,location:"WH-A"},
    {id:"I3",itemCode:"ITM-003",oldPart:"12515572",newPart:"ON-003",description:"Filter Element",unit:"PCS",stock:42,min:10,location:"WH-B"}
  ],
  gatepasses:[],
  templates:[],
  logs:[]
};
function uid(prefix="ID"){return prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)}
function loadDB(){try{const x=JSON.parse(localStorage.getItem(DB_KEY));return x||structuredClone(defaultDB)}catch(e){return structuredClone(defaultDB)}}
let db=loadDB();
function saveDB(){localStorage.setItem(DB_KEY,JSON.stringify(db))}
function logAction(action,ref=""){db.logs.unshift({id:uid("LOG"),date:new Date().toISOString(),action,ref});db.logs=db.logs.slice(0,500);saveDB()}
function nextGatePassNo(){const s=db.settings;const n=String(s.nextNo).padStart(Number(s.length)||6,"0");s.nextNo=Number(s.nextNo)+1;saveDB();return `${s.prefix}-${new Date().getFullYear()}-${n}`}
