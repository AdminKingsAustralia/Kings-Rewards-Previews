(function(root,factory){
'use strict';
var api=factory();
if(typeof module==='object'&&module.exports) module.exports=api;
else api.init(root,root.document);
}(typeof window!=='undefined'?window:this,function(){
'use strict';
function totals(quantity,member){
  if(!Number.isInteger(quantity)||quantity<0||quantity>99) throw new RangeError('Quantity must be 0–99.');
  var subtotal=quantity*3200;
  var eligible=Boolean(member)&&subtotal>=5000;
  var discount=eligible?Math.min(Math.round(subtotal*25/100),4000):0;
  // Demo assumes an approved delivery area and an unused introductory delivery.
  var delivery=quantity===0?0:eligible||subtotal>=15000?0:1000;
  return {subtotal:subtotal,discount:discount,delivery:delivery,total:subtotal-discount+delivery};
}
function init(win,doc){
  var quantity=0, storageKey='kings_preview_cart_quantity';
  try{var stored=Number(win.sessionStorage.getItem(storageKey));if(Number.isInteger(stored)&&stored>=0&&stored<=99)quantity=stored;}catch(e){}
  var member=doc.getElementById('demo-member');
  var checkout=doc.getElementById('demo-checkout');
  function money(cents){return '$'+(cents/100).toFixed(2);}
  function render(){
    try{win.sessionStorage.setItem(storageKey,String(quantity));}catch(e){}
    var values=totals(quantity,member.checked);
    doc.getElementById('cart-count').textContent='('+quantity+')';
    doc.querySelectorAll('button[data-checkout]').forEach(function(button){button.disabled=quantity===0;});
    doc.getElementById('checkout-empty').hidden=quantity!==0;
    doc.getElementById('checkout-content').hidden=quantity===0;
    doc.getElementById('checkout-qty').textContent=String(quantity);
    doc.getElementById('qty-minus').disabled=quantity===0;
    doc.getElementById('qty-plus').disabled=quantity===99;
    doc.getElementById('checkout-subtotal').textContent=money(values.subtotal);
    doc.getElementById('checkout-discount').textContent='−'+money(values.discount);
    doc.getElementById('checkout-delivery').textContent=money(values.delivery);
    doc.getElementById('checkout-total').textContent=money(values.total);
    doc.getElementById('offer-note').textContent=member.checked?(values.subtotal<5000?'The welcome offer needs at least $50 of products. Add another ribeye to try it.':'Example: 25% off, capped at $40, with one introductory free delivery. Thresholds use the pre-discount product subtotal in this demo.'):'Continue as a guest, or select the member simulation above to compare. The $10 delivery fee is an example only.';
    doc.getElementById('demo-result').textContent='';
  }
  function openCheckout(){render();checkout.hidden=false;checkout.focus();checkout.scrollIntoView({block:'start',behavior:'smooth'});}
  doc.querySelectorAll('[data-checkout]').forEach(function(button){button.addEventListener('click',function(event){event.preventDefault();openCheckout();});});
  doc.getElementById('add-to-cart').addEventListener('click',function(){
    if(quantity>=99){doc.getElementById('cart-status').textContent='Demo quantity limit reached.';return;}
    quantity++;render();doc.getElementById('cart-status').textContent='Ribeye added. You can continue to checkout below.';
    doc.dispatchEvent(new win.CustomEvent('wc-blocks_added_to_cart'));
  });
  doc.getElementById('qty-minus').addEventListener('click',function(){if(quantity>0)quantity--;render();});
  doc.getElementById('qty-plus').addEventListener('click',function(){if(quantity<99)quantity++;render();});
  member.addEventListener('change',render);
  doc.getElementById('complete-demo').addEventListener('click',function(){
    if(!quantity)return;
    doc.getElementById('demo-result').textContent='Demo checkout complete. No payment was taken and no real order was placed.';
  });
  doc.getElementById('reset-demo').addEventListener('click',function(){
    try{win.sessionStorage.removeItem(win.KingsRewards.storageKey);win.sessionStorage.removeItem(storageKey);}catch(e){}
    doc.cookie=encodeURIComponent(win.KingsRewards.storageKey)+'=; Max-Age=0; Path=/; SameSite=Lax';
    win.location.reload();
  });
  var popupButton=doc.getElementById('show-signup-popup');
  if(popupButton)popupButton.addEventListener('click',function(){doc.dispatchEvent(new win.CustomEvent('kings-rewards-preview-open'));});
  render();
}
return {totals:totals,init:init};
}));

