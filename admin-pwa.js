(() => {
  const bar=document.getElementById("adminInstallBar");
  const button=document.getElementById("adminInstallBtn");
  const close=document.getElementById("adminInstallClose");
  if(!bar||!button)return;
  let promptEvent=null;
  const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  if("serviceWorker" in navigator&&location.protocol==="https:"){
    addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(e=>console.warn("BERU ADMIN offline support:",e)));
  }
  if(standalone)return;
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();promptEvent=e;bar.hidden=false;});
  addEventListener("appinstalled",()=>{bar.hidden=true;promptEvent=null;});
  button.addEventListener("click",async()=>{
    if(promptEvent){promptEvent.prompt();await promptEvent.userChoice;promptEvent=null;bar.hidden=true;return;}
    const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(ios?"To install BERU ADMIN: tap Share in Safari, then choose “Add to Home Screen”.":"Open the browser menu (⋮) and choose “Install app” or “Add to Home screen”.");
  });
  close?.addEventListener("click",()=>{bar.hidden=true;});
})();