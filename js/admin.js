(function(){
 const $=id=>document.getElementById(id);let current=[];
 const status=(t,good=false)=>{$('admin-status').textContent=t;$('admin-status').className='admin-status'+(good?' good':'');};
 const fields=['name','price','category','year','image','link','description'];
 function values(){const v={};fields.forEach(k=>v[k]=$('p-'+k).value.trim());v.seller='Старинная Коллекция';v.photos=v.image?[v.image]:[];return v;}
 function reset(){ $('product-form').reset();$('p-id').value='';$('p-category').value='Разное';$('form-title').textContent='Добавить товар';$('cancel-edit').hidden=true;}
 function edit(p){$('p-id').value=p.id;fields.forEach(k=>$('p-'+k).value=p[k]||'');$('form-title').textContent='Редактировать товар';$('cancel-edit').hidden=false;window.scrollTo({top:0,behavior:'smooth'});}
 function render(){ $('product-count').textContent='Всего товаров: '+current.length;
 $('product-list').innerHTML=current.map(p=>`<div class="admin-product"><div><strong>${esc(p.name)}</strong><small>${esc(p.price)} · ${esc(p.category)}</small></div><div class="admin-actions"><button class="admin-btn" data-edit="${p.id}">Изменить</button><button class="admin-btn danger" data-delete="${p.id}">Удалить</button></div></div>`).join('')||'<p>Каталог пока пуст.</p>';
 }
 function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 async function load(){const {data,error}=await sb.from('products').select('*').order('id',{ascending:false});if(error)throw error;current=(data||[]).map(p=>({...p,avitoId:p.avito_id||String(p.id)}));render();}
 document.addEventListener('DOMContentLoaded',async()=>{
   if(!window.sb){status('Сначала настройте Supabase в js/config.js. См. README.md.');return;}
   try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session){status('Войдите на главной странице под аккаунтом владельца, затем откройте админ-панель.');return;}
    const {data:profile,error}=await sb.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
    if(error)throw error;
    if(!profile||profile.role!=='admin'){status('Доступ запрещён. У этого аккаунта нет прав администратора.');return;}
    status('Вы вошли как администратор: '+session.user.email,true);$('admin-content').hidden=false;
    await load();
    $('import-catalog').hidden=current.length>0;
   }catch(e){status('Ошибка: '+e.message);}
   $('import-catalog').addEventListener('click',async()=>{
    if(!confirm('Импортировать товары из исходного catalog.js?'))return;
    try{const rows=(window.CATALOG||[]).map(p=>({avito_id:String(p.avitoId||p.id),name:p.name,price:p.price||'Цена по запросу',seller:p.seller||'Старинная Коллекция',category:p.category||'Разное',year:p.year||'',image:p.image||'',photos:p.photos||[],link:p.link||'',description:p.description||''}));
      const {error}=await sb.from('products').upsert(rows,{onConflict:'avito_id'});if(error)throw error;await load();$('import-catalog').hidden=true;status('Исходный каталог импортирован.',true);
    }catch(e){status('Ошибка импорта: '+e.message);}
   });
 });
 $('product-form').addEventListener('submit',async e=>{
   e.preventDefault();if(!window.sb)return;
   try{const v=values(),id=$('p-id').value;let result;
    if(id)result=await sb.from('products').update(v).eq('id',id);else result=await sb.from('products').insert({...v,avito_id:'manual-'+crypto.randomUUID()});
    if(result.error)throw result.error;await load();reset();status('Товар сохранён.',true);
   }catch(err){status('Не удалось сохранить: '+err.message);}
 });
 $('cancel-edit').addEventListener('click',reset);
 $('product-list').addEventListener('click',async e=>{
  const eb=e.target.closest('[data-edit]'),db=e.target.closest('[data-delete]');
  if(eb){const p=current.find(x=>String(x.id)===eb.dataset.edit);if(p)edit(p);}
  if(db){const p=current.find(x=>String(x.id)===db.dataset.delete);if(!p||!confirm('Удалить товар «'+p.name+'»?'))return;
   const {error}=await sb.from('products').delete().eq('id',p.id);if(error){status('Не удалось удалить: '+error.message);return;}await load();status('Товар удалён.',true);
  }
 });
})();
