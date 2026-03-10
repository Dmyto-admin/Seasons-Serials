import { db } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const products = [
  {id:"saleProductOne",msg:"prod1Msg",a:"prod1AvailableBtn",s:"prod1SoldBtn"},
  {id:"saleProductTwo",msg:"prod2Msg",a:"prod2AvailableBtn",s:"prod2SoldBtn"},
  {id:"saleProductThree",msg:"prod3Msg",a:"prod3AvailableBtn",s:"prod3SoldBtn"}
];

products.forEach(p=>{

const productRef = doc(db,"products",p.id);

const msg = document.getElementById(p.msg);

document.getElementById(p.a).addEventListener("click", async ()=>{

await updateDoc(productRef,{
status:"available",
reservedUntil:0,
reservedBy:""
});

msg.style.color="green";
msg.innerText="Operation was a success";

});

document.getElementById(p.s).addEventListener("click", async ()=>{

await updateDoc(productRef,{
status:"sold",
reservedUntil:0,
reservedBy:""
});

msg.style.color="green";
msg.innerText="Operation was a success";

});

});