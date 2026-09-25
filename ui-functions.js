window.showToast = (msg, err=false) => { 
    const t = document.getElementById('custom-toast'); 
    if(!t) return;
    document.getElementById('toast-msg').innerText = msg; 
    t.className = `fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999] shadow-2xl rounded-xl p-4 flex items-center gap-3 show border-l-4 ${err ? 'bg-red-50 border-red-500' : 'bg-surface border-primary'}`; 
    document.getElementById('toast-icon').innerText = err ? 'error' : 'check_circle'; 
    document.getElementById('toast-icon').className = `material-symbols-outlined text-2xl ${err ? 'text-red-500' : 'text-primary'}`; 
    setTimeout(() => t.classList.remove('show'), 3500); 
};

window.hideToast = () => { document.getElementById('custom-toast')?.classList.remove('show'); };

window.navigate = (vid) => { 
    document.querySelectorAll('main').forEach(el => { 
        el.classList.add('hidden-view'); 
        el.classList.remove('flex', 'block'); 
    }); 
    const target = document.getElementById(vid); 
    if(target) {
        target.classList.remove('hidden-view'); 
        target.classList.add(vid.includes('step') || vid.includes('otp') || vid.includes('admin') || vid.includes('dashboard') || vid === 'view-home' || vid === 'view-waiting-room' ? 'flex' : 'block'); 
    }
    window.scrollTo(0, 0); 
    if(vid === 'view-admin' && typeof window.loadAdminData === 'function') window.loadAdminData(); 
    if(vid === 'view-org-dashboard' && typeof window.loadOrgDirectory === 'function') window.loadOrgDirectory(); 
};

window.openModal = (mid) => { const m = document.getElementById(mid); if(m) { m.classList.remove('hidden-view'); m.classList.add('flex'); } };
window.closeModal = (mid) => { const m = document.getElementById(mid); if(m) { m.classList.add('hidden-view'); m.classList.remove('flex'); } };

window.switchSpecTab = (t) => { 
    ['home', 'cv', 'requests', 'orgs'].forEach(x => { 
        document.getElementById('scontent-' + x)?.classList.add('hidden'); 
        document.getElementById('scontent-' + x)?.classList.remove('block', 'flex'); 
        document.getElementById('stab-' + x)?.classList.remove('bg-white/20'); 
        document.getElementById('stab-' + x)?.classList.add('text-white/70', 'hover:bg-white/10'); 
    }); 
    document.getElementById('scontent-' + t)?.classList.remove('hidden'); 
    document.getElementById('scontent-' + t)?.classList.add(t === 'requests' ? 'flex' : 'block'); 
    document.getElementById('stab-' + t)?.classList.remove('text-white/70', 'hover:bg-white/10'); 
    document.getElementById('stab-' + t)?.classList.add('bg-white/20'); 
    if(t === 'orgs' && typeof window.loadSpecOrganizations === 'function') window.loadSpecOrganizations();
};

window.switchOrgTab = (t) => { 
    ['home', 'specialists', 'messages'].forEach(x => { 
        document.getElementById('ocontent-' + x)?.classList.add('hidden'); 
        document.getElementById('ocontent-' + x)?.classList.remove('block', 'flex'); 
        document.getElementById('otab-' + x)?.classList.remove('bg-white/20'); 
        document.getElementById('otab-' + x)?.classList.add('text-white/70', 'hover:bg-white/10'); 
    }); 
    document.getElementById('ocontent-' + t)?.classList.remove('hidden'); 
    document.getElementById('ocontent-' + t)?.classList.add(t === 'messages' ? 'flex' : 'block'); 
    document.getElementById('otab-' + t)?.classList.remove('text-white/70', 'hover:bg-white/10'); 
    document.getElementById('otab-' + t)?.classList.add('bg-white/20'); 
};

window.switchAdminTab = (t) => { 
    document.getElementById('admin-spec-sec')?.classList.toggle('hidden', t !== 'specialists'); 
    document.getElementById('admin-org-sec')?.classList.toggle('hidden', t !== 'organizations'); 
    const as = document.getElementById('atab-spec'), ao = document.getElementById('atab-org');
    if(as) as.className = t === 'specialists' ? "flex items-center gap-2 w-full text-right px-4 py-3 rounded-xl bg-slate-800 text-white font-bold transition-colors" : "flex items-center gap-2 w-full text-right px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"; 
    if(ao) ao.className = t === 'organizations' ? "flex items-center gap-2 w-full text-right px-4 py-3 rounded-xl bg-slate-800 text-white font-bold transition-colors" : "flex items-center gap-2 w-full text-right px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"; 
};

window.simulatePersonalScan = async (input) => {
    if(!input.files[0]) return;
    const file = input.files[0];
    const overlay = document.getElementById('personal_scan_overlay');
    overlay.classList.remove('hidden');

    let extName = '', extId = '', extPhone = '';

    const extractTextData = (rawText) => {
        const text = rawText.replace(/\n/g, ' ');
        const idMatch = text.match(/\b([12]\d{9})\b/);
        if(idMatch) extId = idMatch[1];
        
        const cleanForPhone = text.replace(/[\s\-\+\(\)]/g, '');
        const phoneMatch = cleanForPhone.match(/(?:9665|05)\d{8}/);
        if(phoneMatch) {
            let p = phoneMatch[0];
            if(p.startsWith('966')) p = '0' + p.substring(3);
            extPhone = p;
        }

        const engNameRegex = /\b([a-zA-Z]{2,}(?:\s+[a-zA-Z]{1,}){1,5})\b/g;
        const engMatches = text.match(engNameRegex);
        let foundName = false;
        
        if (engMatches) {
            const excludeEngWords = ['kingdom', 'saudi', 'arabia', 'ministry', 'freelancer', 'elesl'];
            const validNames = engMatches.filter(m => !excludeEngWords.some(ex => m.toLowerCase().includes(ex)));
            if (validNames.length > 0) {
                validNames.sort((a, b) => b.length - a.length);
                extName = validNames[0].trim().toUpperCase();
                foundName = true;
            }
        }
        
        if (!foundName) {
            const arabicWords = text.match(/([أ-ي]{3,})/g);
            if (arabicWords && arabicWords.length >= 3) {
                const excludeWords = ['المملكة', 'العربية', 'السعودية', 'وزارة', 'الهيئة', 'رقم', 'تاريخ', 'اصدار', 'الوطنية', 'هوية', 'مقيم', 'بطاقة', 'رخصة', 'العمل', 'بيئة', 'المركز', 'مكان', 'الميلاد', 'صادرة', 'سجل', 'الاساسية', 'البيانات', 'صاحب', 'العنوان', 'الخدمات', 'الفئة', 'انتهاء', 'الهاتف'];
                const filteredWords = arabicWords.filter(w => !excludeWords.includes(w));
                if (filteredWords.length >= 3) extName = filteredWords.slice(0, Math.min(4, filteredWords.length)).join(' ');
            }
        }
    };

    try {
        if (file.type === 'application/pdf') {
            if (!window.pdfWorkerUrl) {
                const workerRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js');
                const workerText = await workerRes.text();
                window.pdfWorkerUrl = URL.createObjectURL(new Blob([workerText], { type: 'text/javascript' }));
                pdfjsLib.GlobalWorkerOptions.workerSrc = window.pdfWorkerUrl;
            }
            const pdf = await pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise;
            const page = await pdf.getPage(1); 
            extractTextData((await page.getTextContent()).items.map(i => i.str).join(' '));
            
            if((!extId || !extPhone || !extName) && typeof Tesseract !== 'undefined') {
                const viewport = page.getViewport({scale: 2.0}); 
                const canvas = document.createElement('canvas'); 
                const ctx = canvas.getContext('2d'); 
                canvas.height = viewport.height; canvas.width = viewport.width;
                await page.render({canvasContext: ctx, viewport: viewport}).promise;
                extractTextData((await Tesseract.recognize(canvas.toDataURL('image/jpeg'), 'ara+eng')).data.text); 
            }
        } else if (file.type.startsWith('image/')) {
            const img = new Image(); img.src = URL.createObjectURL(file);
            await new Promise(r => { 
                img.onload = async () => { 
                    const canvas = document.createElement('canvas'); 
                    canvas.width = img.width; canvas.height = img.height; 
                    canvas.getContext('2d').drawImage(img, 0, 0); 
                    if(typeof Tesseract !== 'undefined') extractTextData((await Tesseract.recognize(canvas.toDataURL('image/jpeg'), 'ara+eng')).data.text); 
                    r(); 
                }; 
            });
        }
    } catch(e) { console.error("Scan error", e); }

    overlay.classList.add('hidden');
    if (extName) document.getElementById('full_name').value = extName;
    if (extId) document.getElementById('national_id').value = extId;
    if (extPhone) document.getElementById('phone').value = extPhone;
    showToast('✨ تمت القراءة بنجاح! يرجى التأكد من البيانات.');
};

window.simulateAIScan = async (input, type) => {
    if(!input.files[0]) return; 
    const file = input.files[0];
    
    if(type === 'spec') { 
        document.getElementById('file_upload').files = input.files; 
        document.getElementById('upload_label').innerHTML = `<span class="material-symbols-outlined text-primary text-2xl block mb-1">task_alt</span><span class="text-sm font-bold text-primary break-all">تم الإرفاق تلقائياً: ${file.name}</span>`; 
    } else { 
        document.getElementById('org_file_upload').files = input.files; 
        document.getElementById('org_upload_label').innerHTML = `<span class="material-symbols-outlined text-primary text-2xl block mb-1">task_alt</span><span class="text-sm font-bold text-primary break-all">تم الإرفاق تلقائياً: ${file.name}</span>`; 
    }
    
    const overlay = document.getElementById(type + '_scan_overlay'); 
    overlay.classList.remove('hidden');
    let extractedLicense = null, extractedDate = null;

    const extractTextData = (text) => {
        let cleanText = text.toUpperCase().replace(/\s+/g, "");
        if (type === 'spec') {
            const transMatch = cleanText.match(/(ELESL-\d{4}-\d+)/) || cleanText.match(/(ELESL\d{4}\d+)/);
            if (transMatch) extractedLicense = transMatch[1].replace(/(ELESL)(\d{4})(\d+)/, '$1-$2-$3');
            const dateMatches = cleanText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/g);
            if(dateMatches) {
                let maxDateVal = 0;
                dateMatches.forEach(d => {
                    const p = d.split(/[\/\-]/);
                    const t = new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
                    if(t > maxDateVal) { maxDateVal = t; extractedDate = `${p[2]}-${p[1]}-${p[0]}`; }
                });
            }
        } else {
            const crMatch = cleanText.match(/(\d{10})/); 
            if (crMatch) extractedLicense = crMatch[1];
        }
    };

    try {
        if (file.type === 'application/pdf') {
            if (!window.pdfWorkerUrl) {
                const workerRes = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js');
                window.pdfWorkerUrl = URL.createObjectURL(new Blob([await workerRes.text()], { type: 'text/javascript' }));
                pdfjsLib.GlobalWorkerOptions.workerSrc = window.pdfWorkerUrl;
            }
            const pdf = await pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise;
            const page = await pdf.getPage(1); 
            extractTextData((await page.getTextContent()).items.map(i => i.str).join(''));
            
            if(!extractedLicense && typeof Tesseract !== 'undefined') {
                const viewport = page.getViewport({scale: 3.0}); 
                const canvas = document.createElement('canvas'); 
                canvas.height = viewport.height; canvas.width = viewport.width;
                await page.render({canvasContext: canvas.getContext('2d'), viewport: viewport}).promise;
                try { extractTextData((await Tesseract.recognize(canvas.toDataURL('image/jpeg'), 'eng')).data.text); } catch(e){}
            }
        }
    } catch(e) { console.error(e); }

    overlay.classList.add('hidden'); 
    if (extractedLicense) {
        if(type === 'spec') {
            document.getElementById('license').value = extractedLicense; 
            if(extractedDate) document.getElementById('issue_date').value = extractedDate; 
            window.specAutoApprove = true; 
            showToast('✨ تم الاستخراج بنجاح!');
        } else {
            document.getElementById('cr_number').value = extractedLicense; 
            document.getElementById('org_name').value = "جاري الجلب..."; 
            window.orgAutoApprove = true; 
            showToast('✨ تم الاستخراج!'); 
            window.fetchCRData(); 
        }
    } else {
        showToast(`لم يتم العثور على الرقم، أدخله يدوياً.`, true);
    }
};
