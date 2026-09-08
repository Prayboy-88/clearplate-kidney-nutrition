// Run with Playwright CLI in a disposable local-app browser session.
async(page) => {
 const checks=[];
 await page.evaluate(()=>localStorage.removeItem('clearplate-adpkd-mvp-v3'));
 await page.reload();
 await page.getByRole('button',{name:'Profile',exact:true}).click();
 await page.getByRole('button',{name:'Save plan',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.evaluate(()=>{
  const defaultProfile=JSON.parse(localStorage.getItem('clearplate-adpkd-mvp-v3')).profile;
  const now=new Date();
  const date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  localStorage.setItem('clearplate-adpkd-mvp-v3',JSON.stringify({profile:defaultProfile,entries:[
   {id:'layout-lunch',date,meal:'Lunch',servings:1,source:'custom',customFood:{name:'Layout test lunch',method:'packaged',calories:480,protein:21,sodium:360,potassium:null,phosphorus:null}},
  ]}));
 });
 await page.reload();
 await page.getByRole('button',{name:'History',exact:true}).click();
 for(const width of [320,390,430]) {
  await page.setViewportSize({width,height:844});
  const metrics=await page.evaluate(()=>{
   const day=document.querySelector('.history-calendar-day');
   const values=document.querySelector('.history-calendar-values');
   const card=document.querySelector('.history-nutrition-card > strong');
   return {
    dateFont:parseFloat(getComputedStyle(day.querySelector('b')).fontSize),
    dateHeight:day.getBoundingClientRect().height,
    hiddenCellNutrients:getComputedStyle(values).display==='none',
    reportFont:parseFloat(getComputedStyle(card).fontSize),
    fitsViewport:document.documentElement.scrollWidth<=window.innerWidth,
    centeredPanels:[...document.querySelectorAll('.history-calendar-panel, .history-report-panel')].every(e=>{
     const rect=e.getBoundingClientRect();
     const right=document.documentElement.clientWidth-rect.right;
     return rect.left>=19 && right>=19 && Math.abs(rect.left-right)<1;
    }),
   };
  });
  checks.push({width,pass:metrics.dateFont>=16&&metrics.dateHeight>=48&&metrics.hiddenCellNutrients&&metrics.reportFont>=20&&metrics.fitsViewport&&metrics.centeredPanels,...metrics});
  if(width===390) await page.screenshot({path:'output/playwright/history-mobile-after.png',fullPage:true,animations:'disabled'});
 }
 await page.getByRole('button',{name:'Previous month',exact:true}).click();
 const previous=await page.getByRole('grid').getAttribute('aria-label');
 await page.getByRole('button',{name:'Next month',exact:true}).click();
 checks.push({name:'month navigation',pass:previous!==await page.getByRole('grid').getAttribute('aria-label')});
 const firstDay=page.getByRole('gridcell').first();
 await firstDay.click();
 checks.push({name:'date selection',pass:await firstDay.getAttribute('aria-pressed')==='true'});
 await page.locator('main').getByRole('button',{name:'Today',exact:true}).click();
 await page.setViewportSize({width:1280,height:900});
 checks.push({name:'desktop keeps calendar nutrition',pass:await page.locator('.history-calendar-values').first().isVisible()});
 await page.screenshot({path:'output/playwright/history-desktop-after.png',fullPage:true,animations:'disabled'});
 return {passed:checks.filter(c=>c.pass).length,total:checks.length,checks};
}
