// Sayfalar arası geçiş ve cevapların toplanması.
// pages/ altındaki her sayfa bu dosyayı </body> öncesinde <script src="../flow.js"></script> ile yükler.
// Cevaplar localStorage'da "gdg_answers" anahtarında tutulur.
// Backend tarafı için: GDGFlow.getAnswers() tüm cevapları tek bir obje olarak döner.
(() => {
  const STEPS = [
    '1-giris.html',
    '2-ilgi-alanlari.html',
    '3-sohbet-tarzi.html',
    '4-hobiler.html',
    '5-beklentiler.html',
    '6-masa-atmosferi.html',
    '7-masan-hazir.html',
  ];
  const STORAGE_KEY = 'gdg_answers';
  const RESULT_KEY = 'gdg_result';

  // TODO(backend): cevapları sunucuya gönderip eşleşme sonucunu döndür.
  // Beklenen dönüş: { table: '04', icebreaker: 'Gününüz nasıl geçti?' }
  // Hata durumunda throw edilirse son soru sayfasında hata mesajı gösterilir.
  // Örnek:
  //   const res = await fetch('/api/match', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(answers),
  //   });
  //   if (!res.ok) throw new Error('HTTP ' + res.status);
  //   return res.json();
  const API_URL = "http://localhost:3000/api";

  const api = {
    async sendAnswers(answers) {
      // Çift kaydı önlemek için cihaza özel bir kimlik (ID) oluşturuyoruz
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem('deviceId', deviceId);
      }

      // Backend'in beklediği JSON formatına uygun eşleştirme yapıyoruz
      const payload = {
          name: answers.name || "Misafir",
          deviceId: deviceId,
          answers: {
              crowd: 3, 
              starter: 3,
              interests: (answers.interests && answers.interests.length > 0) ? answers.interests : ["tech"],
              style: answers.conversationStyle === 'balanced' ? 'funny' : (answers.conversationStyle || 'listener'),
              goal: answers.expectation || 'network',
              friday: 'out',
              drink: 'coffee'
          }
      };

      const res = await fetch(`${API_URL}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
          // Eğer bu cihaz zaten kayıtlıysa, eski masa bilgisini geri getir
          if (res.status === 409 && data.error?.details?.participantId) {
              const getRes = await fetch(`${API_URL}/participants/${data.error.details.participantId}`);
              return await getRes.json();
          }
          throw new Error(data.error?.message || 'Eşleştirme başarısız');
      }

      return data;
    },
  };

  // Kart id'leri yerine backend'e anlamlı değerler gitsin diye.
  const CONVERSATION_STYLES = { 'opt-a': 'talker', 'opt-b': 'listener', 'opt-c': 'balanced' };
  const HOBBIES = { 'opt-a': 'music-arts', 'opt-b': 'coffee-travel', 'opt-c': 'games-popculture', 'opt-d': 'books-science' };

  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  };
  const save = (patch) => {
    const answers = Object.assign(load(), patch);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(answers)); } catch (e) {}
    return answers;
  };
  const keyOf = (map, value) => Object.keys(map).find((k) => map[k] === value);

  const current = STEPS.indexOf(location.pathname.split('/').pop());
  if (current === -1) return;

  const goTo = (i) => { location.href = STEPS[i]; };
  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  const shake = (el) => {
    if (!el) return;
    el.classList.add('animate-pulse');
    setTimeout(() => el.classList.remove('animate-pulse'), 600);
  };

  // Sayfaların kendi script'lerindeki tıklama efektleri çalışmaya devam etsin diye
  // listener ekliyoruz, mevcut olanları değiştirmiyoruz.
  const onClick = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  const answers = load();

  // Sağ üstteki profil ikonunun yerine kullanıcının baş harfi.
  const avatar = document.querySelector('header .w-8.h-8.rounded-full.bg-primary');
  if (avatar && answers.name) {
    avatar.innerHTML = '';
    avatar.textContent = answers.name.charAt(0).toLocaleUpperCase('tr');
    avatar.classList.add('text-on-primary', 'font-label-lg', 'text-label-lg');
    avatar.title = answers.name;
  }

  const steps = [
    // 1. Giriş: ad soyad
    () => {
      const input = document.getElementById('fullNameInput');
      if (answers.name) {
        input.value = answers.name;
        input.dispatchEvent(new Event('input'));
      }
      onClick('submitButton', () => {
        const name = input.value.trim();
        if (!name) return;
        save({ name });
        next();
      });
    },

    // 2.1 İlgi alanları (çoklu seçim)
    () => {
      const cards = document.querySelectorAll('.topic-card');
      // Kayıtlı seçimleri geri yükle; click sayfanın kendi sayacını da günceller.
      (answers.interests || []).forEach((id) => {
        const card = document.querySelector('.topic-card[data-id="' + id + '"]');
        if (card && card.getAttribute('data-selected') !== 'true') card.click();
      });
      const collect = () => Array.from(cards)
        .filter((c) => c.getAttribute('data-selected') === 'true')
        .map((c) => c.getAttribute('data-id'));
      onClick('cta-next', () => {
        const interests = collect();
        if (interests.length === 0) {
          shake(document.getElementById('selection-counter'));
          return;
        }
        save({ interests });
        next();
      });
      const prevBtn = document.querySelector('[aria-label="Önceki Soru"]');
      if (prevBtn) prevBtn.addEventListener('click', prev);
    },

    // 2.2 Sohbet tarzı
    () => {
      const saved = keyOf(CONVERSATION_STYLES, answers.conversationStyle);
      if (saved) window.selectOption(saved);
      onClick('btn-next', () => {
        const selected = Object.keys(CONVERSATION_STYLES).find((id) =>
          document.getElementById('card-' + id).classList.contains('bg-surface-container-high'));
        save({ conversationStyle: CONVERSATION_STYLES[selected] });
        next();
      });
    },

    // 2.3 Teknoloji dışı hobiler
    () => {
      window.selectOption(keyOf(HOBBIES, answers.hobby) || 'opt-a');
      onClick('btnNext', () => {
        const selected = Object.keys(HOBBIES).find((id) =>
          document.getElementById('card-' + id).getAttribute('aria-checked') === 'true');
        save({ hobby: HOBBIES[selected] });
        next();
      });
    },

    // 2.4 Etkinlikten beklentiler
    () => {
      const saved = answers.expectation &&
        document.querySelector('.option-card[data-option="' + answers.expectation + '"]');
      if (saved) window.selectOption(saved);
      onClick('next-button', () => {
        const selected = document.querySelector('.option-card[aria-checked="true"]');
        save({ expectation: selected.getAttribute('data-option') });
        next();
      });
    },

    // 2.5 Masa atmosferi: son soru, cevaplar burada tamamlanır
    () => {
      const saved = answers.tableVibe &&
        document.querySelector('input[name="table_vibe"][value="' + answers.tableVibe + '"]');
      if (saved) saved.checked = true;
      const btn = document.getElementById('submit-step-2');
      const btnContent = btn.innerHTML;
      const error = document.createElement('p');
      error.setAttribute('role', 'alert');
      error.className = 'hidden mb-3 px-4 py-3 rounded-lg bg-error-container text-on-error-container font-body-md text-body-md';
      error.textContent = 'Masan belirlenirken bir sorun oluştu. Bağlantını kontrol edip tekrar dene.';
      btn.parentElement.before(error);

      const setLoading = (loading) => {
        btn.disabled = loading;
        btn.classList.toggle('opacity-80', loading);
        btn.innerHTML = loading
          ? '<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>Masan belirleniyor…</span>'
          : btnContent;
      };

      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const selected = document.querySelector('input[name="table_vibe"]:checked');
        const all = save({ tableVibe: selected.value, completedAt: new Date().toISOString() });
        error.classList.add('hidden');
        setLoading(true);
        try {
          const result = await api.sendAnswers(all);
          try { localStorage.setItem(RESULT_KEY, JSON.stringify(result)); } catch (e) {}
          next();
        } catch (e) {
          console.error('GDG eşleşme hatası:', e);
          setLoading(false);
          error.classList.remove('hidden');
        }
      });
    },

    // 3. Masan hazır
    // 3. Masan hazır (Backend'den Gelen Gerçek Sonuçlar)
    // 3. Masan hazır
    () => {
      let result = null;
      try { result = JSON.parse(localStorage.getItem(RESULT_KEY)); } catch (e) {}
      
      if (!result) return;

      // İsmin sadece ilk kısmını (adını) alalım
      const firstName = result.name ? result.name.split(' ')[0] : (answers.name ? answers.name.split(' ')[0] : '');

      if (result.status === 'seated') {
          // Masaya başarıyla oturduysa
          const titleEl = document.getElementById('ready-title');
          if(titleEl) titleEl.textContent = 'Masan hazır, ' + firstName + '!';
          
          const tableNumEl = document.getElementById('table-number');
          if(tableNumEl) tableNumEl.textContent = 'MASA ' + result.tableNumber;
          
          if (result.iceBreaker) {
              const icebreakerEl = document.getElementById('icebreaker');
              if(icebreakerEl) icebreakerEl.textContent = '“' + result.iceBreaker + '”';
          }
      } else if (result.status === 'waitlist') {
          // Masalar doluysa ve bekleme listesindeyse
          const titleEl = document.getElementById('ready-title');
          if(titleEl) titleEl.textContent = 'Masalar Dolu, ' + firstName;
          
          const tableNumEl = document.getElementById('table-number');
          if (tableNumEl) {
              tableNumEl.textContent = 'SIRA ' + result.waitlistPosition;
              tableNumEl.classList.remove('text-primary');
              tableNumEl.classList.add('text-orange-500'); // Rengi turuncu yap
          }
          
          const icebreakerEl = document.getElementById('icebreaker');
          if (icebreakerEl) {
              icebreakerEl.textContent = 'Şu an bekleme listesindesin. Bir masa boşaldığında yerleşeceksin.';
              icebreakerEl.parentElement.classList.remove('border-primary');
              icebreakerEl.parentElement.classList.add('border-orange-500');
          }
          
          const headerEl = document.querySelector('.uppercase.tracking-wider');
          if (headerEl) headerEl.textContent = 'BEKLEME LİSTESİ';
      }
    },
  ];

  steps[current]();

  window.GDGFlow = {
    getAnswers: load,
    api,
    reset: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(RESULT_KEY);
      } catch (e) {}
    },
  };
})();

