import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp, collection, getDocs, updateDoc, getDoc, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyAtnPXcLjEjT1yw0mpO2qw_6_pYHQsUZeA",
    authDomain: "baeeyen-c7107.firebaseapp.com",
    projectId: "baeeyen-c7107",
    storageBucket: "baeeyen-c7107.firebasestorage.app",
    appId: "1:289802927952:web:deda8750a6bb6d4ce7b655"
});
const auth = getAuth(app), db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
try { signInAnonymously(auth); } catch(e) {}

const safeStorage = { 
    getItem: (k) => { try { return localStorage.getItem(k); } catch(e) { return window['_ls_'+k]; } }, 
    setItem: (k,v) => { try { localStorage.setItem(k,v); } catch(e) { window['_ls_'+k]=v; } }, 
    removeItem: (k) => { try { localStorage.removeItem(k); } catch(e) { delete window['_ls_'+k]; } } 
};

window.performLogout = () => { safeStorage.removeItem('preferredRole'); window.currAccountType = ''; window.myProfileData = null; showToast('تم تسجيل الخروج بنجاح'); setTimeout(() => window.location.reload(), 1000); };
window.verifyAdmin = () => { if(document.getElementById('admin-password').value === '1234') { closeModal('admin-login-modal'); document.getElementById('admin-password').value = ''; navigate('view-admin'); } else { showToast('رمز الدخول غير صحيح!', true); } };

window.currAccountType = ''; window.myProfileData = null; window.tData = {}; window.isOrgReg = false; window.specAutoApprove = false; window.orgAutoApprove = false; window.globalProfilePicData = null; window.globalResumeData = null;

window.checkAndGoToDashboard = async () => {
    const u = auth.currentUser; if(!u) return showToast('يرجى المحاولة مجدداً', true);
    try {
        const prefRole = safeStorage.getItem('preferredRole');
        let tRole = null, pData = null;
        const specDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'specialists', u.uid)); 
        const orgDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'organizations', u.uid)); 

        if(prefRole === 'org' && orgDoc.exists()) { tRole = 'org'; pData = orgDoc.data(); } 
        else if(prefRole === 'spec' && specDoc.exists()) { tRole = 'spec'; pData = specDoc.data(); } 
        else if(specDoc.exists()) { tRole = 'spec'; pData = specDoc.data(); } 
        else if(orgDoc.exists()) { tRole = 'org'; pData = orgDoc.data(); }

        if(tRole === 'spec') {
            window.currAccountType = 'spec'; window.myProfileData = pData;
            if(pData.status === 'approved') {
                document.getElementById('cv_name').value = pData.fullName || ''; document.getElementById('cv_id').value = pData.nationalId || ''; document.getElementById('cv_email').value = pData.email || ''; document.getElementById('cv_phone').value = pData.phone || ''; document.getElementById('cv_edu').value = pData.edu || ''; document.getElementById('cv_years').value = pData.years || ''; document.getElementById('cv_license').value = pData.license || ''; document.getElementById('cv_exp').value = pData.exp || ''; document.getElementById('cv_portfolio').value = pData.portfolio || '';
                if(pData.profilePic) { document.getElementById('profile_pic_preview').src = pData.profilePic; document.getElementById('profile_pic_preview').classList.remove('hidden'); document.getElementById('profile_pic_icon').classList.add('hidden'); window.globalProfilePicData = pData.profilePic; }
                if(pData.resumeFile) window.globalResumeData = pData.resumeFile; 
                navigate('view-specialist-dashboard'); switchSpecTab('home'); window.loadUserChats(); window.listenToRequests(u.uid, 'spec');
            } else { navigate('view-waiting-room'); window.listenToStatus(u.uid, 'spec'); }
            return; 
        }

        if(tRole === 'org') {
            window.currAccountType = 'org'; window.myProfileData = pData;
            if(pData.status === 'approved') { navigate('view-org-dashboard'); switchOrgTab('home'); window.loadUserChats(); window.listenToRequests(u.uid, 'org'); } 
            else { navigate('view-waiting-room'); window.listenToStatus(u.uid, 'org'); }
            return;
        }
        showToast('لم يتم العثور على حساب مسجل', true);
    } catch (e) { showToast('خطأ في الاتصال', true); }
};

window.listenToStatus = (uid, type) => {
    onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', type === 'spec' ? 'specialists' : 'organizations', uid), (snap) => {
        if(snap.exists() && snap.data().status === 'approved') { showToast('تم الاعتماد! جاري الدخول...'); setTimeout(() => window.checkAndGoToDashboard(), 1500); }
    });
};

window.fetchCRData = () => {
    const btn = document.getElementById('fetch_cr_btn'); const origHtml = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">sync</span>'; btn.disabled = true;
    setTimeout(() => {
        const orgNameField = document.getElementById('org_name'), orgDescField = document.getElementById('org_desc');
        orgNameField.value = "شركة التقنية البيئية المحدودة"; orgNameField.classList.replace('cursor-not-allowed', 'bg-white'); orgNameField.classList.remove('text-secondary');
        orgDescField.value = "شركة متخصصة في الاستشارات البيئية."; 
        showToast('تم جلب بيانات السجل بنجاح!'); btn.innerHTML = origHtml; btn.disabled = false;
    }, 1500);
};

document.getElementById('profile_pic_upload')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(file) { 
        const reader = new FileReader(); 
        reader.onload = ev => { window.globalProfilePicData = ev.target.result; const img = document.getElementById('profile_pic_preview'); img.src = window.globalProfilePicData; img.classList.remove('hidden'); document.getElementById('profile_pic_icon').classList.add('hidden'); }; 
        reader.readAsDataURL(file); 
    }
});

document.getElementById('resume_upload')?.addEventListener('change', function(e) { 
    const f = e.target.files[0]; 
    if(f) {
        document.getElementById('resume_upload_label').innerHTML = `<span class="text-primary font-bold">تم إرفاق: ${f.name}</span>`;
        const reader = new FileReader(); reader.onload = ev => { window.globalResumeData = ev.target.result; }; reader.readAsDataURL(f);
    }
});

document.getElementById("form-step1")?.addEventListener("submit", e => { e.preventDefault(); window.isOrgReg = false; window.tData = { n: document.getElementById("full_name").value, id: document.getElementById("national_id").value, em: document.getElementById("email").value, ph: document.getElementById("phone").value }; navigate('view-step2'); });
document.getElementById("form-step2")?.addEventListener("submit", e => { e.preventDefault(); window.tData.lic = document.getElementById("license").value; navigate('view-otp'); showToast("استخدم 123456 للتجربة"); });
document.getElementById("form-org-step1")?.addEventListener("submit", e => { e.preventDefault(); window.isOrgReg = true; window.tData = { on: document.getElementById("org_name").value, cr: document.getElementById("cr_number").value, ph: document.getElementById("org_phone").value, desc: document.getElementById("org_desc").value }; navigate('view-otp'); showToast("استخدم 123456 للتجربة"); });

document.getElementById("form-otp")?.addEventListener("submit", async e => { 
    e.preventDefault(); const u = auth.currentUser; const b = e.target.querySelector('button[type="submit"]'); b.innerHTML = 'جاري...'; b.disabled = true;
    if(u) {
        if(window.isOrgReg) { 
            const fs = window.orgAutoApprove ? 'approved' : 'pending';
            await setDoc(doc(db,'artifacts',appId,'public','data','organizations',u.uid), { status: fs, orgName: window.tData.on, crNumber: window.tData.cr, phone: window.tData.ph, orgDesc: window.tData.desc, createdAt: serverTimestamp() }); 
            safeStorage.setItem('preferredRole', 'org'); b.innerHTML = 'تأكيد'; b.disabled = false;
            if(fs === 'approved') { showToast('تم التفعيل!'); setTimeout(() => window.checkAndGoToDashboard(), 2000); } else { navigate('view-waiting-room'); window.listenToStatus(u.uid, 'org'); }
        } else { 
            const fs = window.specAutoApprove ? 'approved' : 'pending';
            await setDoc(doc(db,'artifacts',appId,'public','data','specialists',u.uid), { status: fs, fullName: window.tData.n, nationalId: window.tData.id, email: window.tData.em, phone: window.tData.ph, license: window.tData.lic, createdAt: serverTimestamp() }); 
            safeStorage.setItem('preferredRole', 'spec'); b.innerHTML = 'تأكيد'; b.disabled = false;
            if(fs === 'approved') { showToast('تم التفعيل!'); setTimeout(() => window.checkAndGoToDashboard(), 2000); } else { navigate('view-waiting-room'); window.listenToStatus(u.uid, 'spec'); }
        }
    } 
});

const otpIn = document.querySelectorAll('.otp-input');
otpIn.forEach((i, idx) => { 
    i.addEventListener('input', e => { if(e.target.value.length === 1 && idx < otpIn.length - 1) otpIn[idx+1].focus(); if(e.target.value.length > 1) e.target.value = e.target.value.slice(0, 1); }); 
    i.addEventListener('keydown', e => { if(e.key === 'Backspace' && !e.target.value && idx > 0) otpIn[idx-1].focus(); }); 
});

window.saveCVSpecialist = async () => {
    const u = auth.currentUser; if(!u) return; 
    const nd = { fullName: document.getElementById('cv_name').value, nationalId: document.getElementById('cv_id').value, email: document.getElementById('cv_email').value, phone: document.getElementById('cv_phone').value, edu: document.getElementById('cv_edu').value, years: document.getElementById('cv_years').value, license: document.getElementById('cv_license').value, exp: document.getElementById('cv_exp').value, portfolio: document.getElementById('cv_portfolio').value, profilePic: window.globalProfilePicData || window.myProfileData?.profilePic || null, resumeFile: window.globalResumeData || window.myProfileData?.resumeFile || null };
    await updateDoc(doc(db,'artifacts',appId,'public','data','specialists',u.uid), nd); 
    if(window.myProfileData) window.myProfileData = {...window.myProfileData, ...nd}; 
    showToast('تم حفظ التحديثات!');
};

window.previewCV = (asOrg = false, specData = null) => {
    const d = specData || { fullName: document.getElementById('cv_name').value, nationalId: document.getElementById('cv_id').value, email: document.getElementById('cv_email').value, phone: document.getElementById('cv_phone').value, edu: document.getElementById('cv_edu').value, years: document.getElementById('cv_years').value, license: document.getElementById('cv_license').value, exp: document.getElementById('cv_exp').value, portfolio: document.getElementById('cv_portfolio').value, profilePic: window.globalProfilePicData || window.myProfileData?.profilePic || null, resumeFile: window.globalResumeData || window.myProfileData?.resumeFile || null };
    document.getElementById('prev_name').innerText = d.fullName || 'بدون اسم'; document.getElementById('prev_edu').innerText = d.edu || 'لم يحدد التخصص';
    const pic = document.getElementById('prev_pic'); if(d.profilePic) { pic.src = d.profilePic; pic.classList.remove('hidden'); } else { pic.classList.add('hidden'); }
    const id = d.nationalId || ''; document.getElementById('prev_id').innerText = (asOrg && id.length >= 10) ? id.substring(0,3) + '****' + id.substring(7) : (id || '-');
    document.getElementById('prev_email').innerText = d.email || '-'; document.getElementById('prev_phone').innerText = d.phone || '-'; document.getElementById('prev_years').innerText = d.years ? d.years + ' سنوات خبرة' : 'مبتدئ'; document.getElementById('prev_lic').innerText = d.license || 'لا يوجد'; document.getElementById('prev_exp').innerText = d.exp || 'لا توجد خبرات مفصلة.';
    const pDiv = document.getElementById('prev_portfolio_div'), pLink = document.getElementById('prev_portfolio'); if(d.portfolio) { pLink.href = d.portfolio; pLink.innerText = d.portfolio; pDiv.classList.remove('hidden'); pDiv.classList.add('flex'); } else { pDiv.classList.add('hidden'); pDiv.classList.remove('flex'); }
    const rDiv = document.getElementById('prev_resume_div'), rLink = document.getElementById('prev_resume_link'); if(d.resumeFile) { rLink.href = d.resumeFile; rDiv.classList.remove('hidden'); rDiv.classList.add('flex'); } else { rDiv.classList.add('hidden'); rDiv.classList.remove('flex'); }
    openModal('cv-preview-modal');
};

window.printProfile = () => { window.print(); };

window.userNamesCache = {};
window.loadUserChats = () => {
    const u = auth.currentUser; if(!u) return;
    const isSpec = window.currAccountType === 'spec';
    const listEl = document.getElementById(isSpec ? 'spec-requests-list' : 'org-requests-list'); if(!listEl) return;
    
    onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), async (snap) => {
        let chats = {};
        snap.forEach(doc => { const m = doc.data(); if(m.chatId && m.chatId.includes(u.uid)) { if(!chats[m.chatId] || (m.timestamp?.seconds > (chats[m.chatId].latest.timestamp?.seconds || 0))) chats[m.chatId] = { latest: m, chatId: m.chatId }; } });
        
        listEl.innerHTML = '';
        if(Object.keys(chats).length === 0) return listEl.innerHTML = '<div class="text-center p-4 text-secondary text-sm">لا توجد محادثات نشطة</div>';

        for(const chatId of Object.keys(chats)) {
            const parts = chatId.split('_'), otherId = isSpec ? parts[2] : parts[1];
            let otherName = window.userNamesCache[otherId];
            if(!otherName) { try { const docRef = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', isSpec ? 'organizations' : 'specialists', otherId)); if(docRef.exists()) { otherName = isSpec ? docRef.data().orgName : docRef.data().fullName; window.userNamesCache[otherId] = otherName; } else { otherName = 'مستخدم'; } } catch(e) { otherName = 'مستخدم'; } }
            const chatDiv = document.createElement('div'); chatDiv.className = "p-3 bg-white border rounded-xl cursor-pointer hover:border-primary shadow-sm mb-2";
            chatDiv.innerHTML = `<div class="font-bold text-primary text-sm">${otherName}</div><div class="text-xs text-secondary truncate">${chats[chatId].latest.isContract ? '📄 عقد' : (chats[chatId].latest.text || '')}</div>`;
            chatDiv.onclick = () => window.openChatRoom(chatId, otherName, isSpec ? 'spec' : 'org'); listEl.appendChild(chatDiv);
        }
    });
};

window.chatUnsub = null; window.activeChatId = null; window.activeChatRole = null;
window.openChatRoom = (chatId, otherName, role) => {
    if(window.chatUnsub) { window.chatUnsub(); window.chatUnsub = null; }
    window.activeChatId = chatId; window.activeChatRole = role; const prefix = role === 'spec' ? 'spec' : 'org';
    document.getElementById(`${prefix}-chat-empty`).classList.add('hidden'); document.getElementById(`${prefix}-chat-header`).classList.remove('hidden'); document.getElementById(`${prefix}-chat-form`).classList.remove('hidden'); document.getElementById(`${prefix}-chat-form`).classList.add('flex');
    const nameEl = document.getElementById(`${prefix}-chat-${role === 'spec' ? 'org' : 'spec'}-name`); if(nameEl) nameEl.innerText = otherName;

    if(role === 'org') {
        const specId = chatId.split('_')[2], viewCvBtn = document.getElementById('view-spec-cv-btn');
        if (viewCvBtn) viewCvBtn.onclick = async () => { const btnOrig = viewCvBtn.innerHTML; viewCvBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">sync</span>'; try { const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'specialists', specId)); if (docSnap.exists()) window.previewCV(true, docSnap.data()); } catch(e) {} viewCvBtn.innerHTML = btnOrig; };
    }
    
    const msgsDiv = document.getElementById(`${prefix}-chat-messages`); msgsDiv.innerHTML = '<div class="text-center text-xs text-gray-400 my-4">جاري الفتح...</div>';
    
    window.chatUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), (snap) => {
        const u = auth.currentUser; if(!u) return; let msgs = [];
        snap.forEach(d => { const m = d.data(); m.id = d.id; if(m.chatId === chatId) msgs.push(m); }); 
        msgs.sort((a,b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)); 
        if (msgs.length === 0) return msgsDiv.innerHTML = '<div class="text-center text-xs text-gray-400 my-4">لا توجد رسائل.</div>'; 
        
        msgsDiv.innerHTML = '';
        msgs.forEach(m => {
            const isMe = m.senderId === u.uid, justify = isMe ? 'justify-end' : 'justify-start';
            if(m.isContract) {
                const o = m.contractData, isAccepted = o.status === 'signed', statusBadge = isAccepted ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">عقد معتمد</span>' : '<span class="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">بانتظار التوقيع</span>';
                let specSigArea = isAccepted ? `<p class="font-[Manrope] text-lg text-green-700 font-bold">${o.specSig}</p>` : (window.currAccountType === 'spec' ? `<div class="flex flex-col gap-1 w-full px-1"><input type="text" id="inline_spec_sig_${m.id}" class="w-full px-2 py-1 border rounded text-center text-sm" placeholder="اسمك"><button type="button" onclick="confirmInlineSignature('${m.id}')" class="bg-primary text-white text-xs py-1 rounded font-bold">توقيع</button></div>` : `<p class="text-sm text-orange-500 mt-2 font-bold animate-pulse">بانتظار الأخصائي...</p>`);
                msgsDiv.innerHTML += `<div class="flex justify-center mb-4 w-full"><div class="bg-white border-2 ${isAccepted ? 'border-green-400' : 'border-primary'} shadow-lg rounded-3xl p-6 w-[95%] relative"><div class="flex justify-between items-center mb-4 border-b pb-3"><h4 class="font-bold ${isAccepted ? 'text-green-700' : 'text-primary'} text-lg">وثيقة عقد</h4>${statusBadge}</div><div class="grid grid-cols-2 gap-4 text-center text-sm"><div class="bg-slate-50 p-3 rounded-xl border flex flex-col items-center justify-center"><p class="text-secondary font-bold text-xs mb-1">المنشأة</p><p class="font-[Manrope] text-lg text-primary font-bold">${o.orgSig}</p></div><div class="bg-slate-50 p-3 rounded-xl border flex flex-col items-center justify-center min-h-[80px]"><p class="text-secondary font-bold text-xs mb-1">الأخصائي</p>${specSigArea}</div></div></div></div>`;
            } else {
                const bubbleClass = isMe ? (role === 'spec' ? 'chat-bubble-me' : 'bg-blue-600 text-white rounded-br-none rounded-t-2xl rounded-bl-2xl') : (role === 'spec' ? 'chat-bubble-other' : 'bg-white border text-slate-800 rounded-bl-none rounded-t-2xl rounded-br-2xl');
                msgsDiv.innerHTML += `<div class="flex ${justify} mb-2"><div class="${bubbleClass} px-4 py-2.5 max-w-[85%] text-sm font-medium leading-relaxed">${m.text}</div></div>`;
            }
        });
        msgsDiv.scrollTop = msgsDiv.scrollHeight; 
    });
};

window.submitApp = async (orgName, btn) => { 
    const u = auth.currentUser; if(!u) return; btn.innerHTML = 'جاري...'; btn.disabled = true;
    try {
        const q = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'organizations')); let targetOrgId = null;
        q.forEach(doc => { if(doc.data().orgName === orgName) targetOrgId = doc.id; });
        if(targetOrgId) {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), { chatId: 'chat_' + targetOrgId + '_' + u.uid, senderId: u.uid, text: 'مرحباً، أود التقديم للعمل معكم.', timestamp: serverTimestamp() });
            showToast('تم التقديم بنجاح إلى ' + orgName); btn.innerHTML = 'تم التقديم'; btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    } catch(e) { showToast('حدث خطأ', true); btn.innerHTML = 'تقديم'; btn.disabled = false; }
};

window.startOrgChat = async (specId, specName) => {
    const u = auth.currentUser; if(!u) return; const chatId = 'chat_' + u.uid + '_' + specId;
    try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), { chatId: chatId, senderId: u.uid, text: 'مرحباً بك، تواصلنا معك بخصوص فرصة تعاون.', timestamp: serverTimestamp() }); showToast('تم فتح قناة تواصل'); switchOrgTab('messages'); window.loadUserChats(); setTimeout(() => openChatRoom(chatId, specName, 'org'), 500); } catch(e) {}
};

window.openContractModal = () => openModal('contract-modal');
window.submitContract = async () => {
    const t = document.getElementById('cont_title').value, d = document.getElementById('cont_duration').value, v = document.getElementById('cont_value').value, s = document.getElementById('cont_org_sig').value;
    if(!t || !d || !v || !s) return showToast('تعبئة جميع البيانات!', true); closeModal('contract-modal');
    try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), { chatId: window.activeChatId, senderId: auth.currentUser.uid, text: 'عقد جديد', isContract: true, contractData: { title: t, value: v, duration: d, orgSig: s, specSig: null, status: 'pending' }, timestamp: serverTimestamp() }); document.getElementById('contract-form').reset(); showToast('تم إرسال العقد'); } catch(e) {}
};

window.confirmInlineSignature = async (msgId) => {
    const input = document.getElementById('inline_spec_sig_' + msgId); if(!input || !input.value.trim()) return showToast('اكتب اسمك للتوقيع', true);
    input.disabled = true;
    try { const mRef = doc(db, 'artifacts', appId, 'public', 'data', 'messages', msgId); const mSnap = await getDoc(mRef); if(mSnap.exists()) { let data = mSnap.data(); data.contractData.specSig = input.value.trim(); data.contractData.status = 'signed'; await updateDoc(mRef, { contractData: data.contractData }); showToast('تم اعتماد العقد بنجاح!'); } } catch(e) { input.disabled = false; }
};

const chatSubmit = async (e, prefix) => { e.preventDefault(); if(!window.activeChatId || window.activeChatRole !== prefix) return; const input = document.getElementById(`${prefix}-chat-input`); const text = input.value.trim(); if(!text) return; input.value = ''; try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), { chatId: window.activeChatId, senderId: auth.currentUser.uid, text: text, timestamp: serverTimestamp() }); } catch(err) {} };
document.getElementById('spec-chat-form')?.addEventListener('submit', e => chatSubmit(e, 'spec')); document.getElementById('org-chat-form')?.addEventListener('submit', e => chatSubmit(e, 'org'));

window.listenToRequests = (uid, role) => {}; 

window.loadAdminData = async () => { 
    if(!auth.currentUser) return; const st = document.getElementById('admin-spec-body'), ot = document.getElementById('admin-org-body'); st.innerHTML = '<tr><td colspan="3" class="p-4 text-center">جاري...</td></tr>';
    try {
        const ss = await getDocs(collection(db,'artifacts',appId,'public','data','specialists')); let sh = ''; ss.forEach(d => { const v = d.data(); const acts = v.status === 'pending' ? `<button type="button" onclick="updateRec('specialists','${d.id}','approved')" class="bg-primary text-white px-2 py-1 rounded mx-1 hover:bg-[#006d44]">قبول</button>` : '-'; sh += `<tr class="border-b"><td class="p-4">${v.fullName || '-'}</td><td class="p-4">${v.status === 'approved' ? 'مفعل' : 'معلق'}</td><td class="p-4 text-center">${acts}</td></tr>`; }); st.innerHTML = sh;
        const os = await getDocs(collection(db,'artifacts',appId,'public','data','organizations')); let oh = ''; os.forEach(d => { const v = d.data(); const acts = v.status === 'pending' ? `<button type="button" onclick="updateRec('organizations','${d.id}','approved')" class="bg-primary text-white px-2 py-1 rounded mx-1 hover:bg-[#006d44]">قبول</button>` : '-'; oh += `<tr class="border-b"><td class="p-4">${v.orgName || '-'}</td><td class="p-4">${v.status === 'approved' ? 'مفعل' : 'معلق'}</td><td class="p-4 text-center">${acts}</td></tr>`; }); ot.innerHTML = oh;
    } catch(e) {}
};

window.updateRec = async (c, i, s) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', c, i), { status: s }); showToast('تم التحديث بنجاح'); window.loadAdminData(); };
window.filterOrganizations = () => { const q = document.getElementById('org-search-input').value.toLowerCase(); document.querySelectorAll('.org-card-spec').forEach(c => c.style.display = c.innerText.toLowerCase().includes(q) ? '' : 'none'); };

window.loadOrgDirectory = async () => {
    const list = document.getElementById('org-specialists-list'); list.innerHTML = '<div class="col-span-full text-center p-4">جاري التحميل...</div>';
    try {
        const ss = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'specialists')); let h = ''; window.specGlobalData = {};
        ss.forEach(d => { 
            const v = d.data(); 
            if(v.status === 'approved' && d.id !== auth.currentUser.uid){
                window.specGlobalData[d.id] = v;
                h += `<div class="org-card-spec bg-white p-6 rounded-2xl border flex flex-col h-full"><h4 class="font-bold text-slate-800 text-lg mb-1">${v.fullName || 'أخصائي'}</h4><p class="text-sm text-slate-500 mb-4">${v.edu || 'لم يحدد التخصص'}</p><div class="mt-auto flex gap-2"><button type="button" onclick="previewCV(true, window.specGlobalData['${d.id}'])" class="flex-1 py-2 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-xs text-slate-800">الملف</button><button type="button" onclick="startOrgChat('${d.id}', '${v.fullName}')" class="flex-[2] py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-xs">تواصل</button></div></div>`;
            }
        });
        list.innerHTML = h || '<div class="col-span-full text-center text-slate-500 p-4">لا يوجد كفاءات معتمدة</div>';
    } catch(e) { list.innerHTML = '<div class="col-span-full text-center text-red-500 p-4">حدث خطأ.</div>'; }
};

window.loadSpecOrganizations = async () => {
    const list = document.getElementById('organizations-list-container'); if(!list) return; list.innerHTML = '<div class="col-span-full text-center">جاري...</div>';
    try {
        const os = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'organizations')); let h = '';
        os.forEach(d => { const v = d.data(); if(v.status === 'approved' && d.id !== auth.currentUser.uid) { h += `<div class="bg-white p-6 rounded-2xl border flex flex-col"><h4 class="font-bold text-primary mb-4">${v.orgName}</h4><button type="button" class="w-full py-2 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white" onclick="submitApp('${v.orgName}', this)">تقديم السيرة</button></div>`; } });
        list.innerHTML = h || '<div class="col-span-full text-center text-secondary">لا توجد منشآت معتمدة</div>';
    } catch(e) { list.innerHTML = '<div class="col-span-full text-center text-red-500">حدث خطأ.</div>'; }
};
