
        // ---------- Supabase (optional cloud sync) ----------
        function getSBConfig() {
            try { return JSON.parse(localStorage.getItem('nutri_sb_config') || '{}'); } catch (e) { return {}; }
        }
        function saveSBConfig(cfg) { localStorage.setItem('nutri_sb_config', JSON.stringify(cfg)); }
        function getSB() {
            const cfg = getSBConfig();
            if (!cfg.url || !cfg.key) return null;
            if (!window.supabase) return null;
            if (!window._sbClient) window._sbClient = window.supabase.createClient(cfg.url, cfg.key);
            return window._sbClient;
        }
        function openSettings() {
            const cfg = getSBConfig();
            document.getElementById('sbUrl').value = cfg.url || '';
            document.getElementById('sbKey').value = cfg.key || '';
            document.getElementById('settingsModal').classList.add('open');
        }
        function closeSettings() { document.getElementById('settingsModal').classList.remove('open'); }
        function saveSettings(e) {
            e.preventDefault();
            saveSBConfig({ url: document.getElementById('sbUrl').value.trim(), key: document.getElementById('sbKey').value.trim() });
            window._sbClient = null;
            closeSettings();
            showToast('Backend settings saved.');
            initAuth();
        }
        async function pushState() {
            const sb = getSB();
            if (!sb) return;
            const { data: { user } } = await sb.auth.getUser();
            if (!user) return;
            const payload = {
                goals: userGoals,
                logs: logsMap,
                selectedDate: selectedDate,
                customFoods: (typeof localFoods !== 'undefined' ? localFoods.filter(f => f.isCustom) : []),
                water: localStorage.getItem('nutri_water_' + selectedDate),
                weight: localStorage.getItem('nutri_weight_log'),
                theme: localStorage.getItem('nutri_theme')
            };
            await sb.from('user_data').upsert({ user_id: user.id, data: payload, updated_at: new Date().toISOString() });
        }
        async function pullState() {
            const sb = getSB();
            if (!sb) return;
            const { data: { user } } = await sb.auth.getUser();
            if (!user) return;
            const { data } = await sb.from('user_data').select('data').eq('user_id', user.id).single();
            if (data && data.data) {
                const d = data.data;
                if (d.goals) userGoals = d.goals;
                if (d.logs) logsMap = d.logs;
                if (d.customFoods) {
                    const savedCustom = d.customFoods;
                    localStorage.setItem('nutri_custom_foods', JSON.stringify(savedCustom));
                    localFoods = [...DEFAULT_FOOD_DB, ...savedCustom];
                }
                localStorage.setItem('nutri_user_goals', JSON.stringify(userGoals));
                localStorage.setItem('nutri_daily_logs', JSON.stringify(logsMap));
                renderFoodDatabase();
                selectDate(d.selectedDate || todayStr());
            }
        }
        async function handleSignup(e) {
            if (e && e.preventDefault) e.preventDefault();
            try {
                const sb = getSB();
                const u = document.getElementById('signupUser').value.trim();
                const emailField = document.getElementById('signupEmail');
                const emailInput = emailField ? emailField.value.trim() : '';
                const p = document.getElementById('signupPass').value;
                const p2 = document.getElementById('signupPass2').value;
                const acceptTerms = document.getElementById('signupAcceptTerms');
                const ageConfirm = document.getElementById('signupAgeConfirm');
                if (!acceptTerms || !acceptTerms.checked) { showToast('You must accept the Terms and Privacy Policy.'); return; }
                if (!ageConfirm || !ageConfirm.checked) { showToast('You must confirm you are at least 13 years old.'); return; }
                const marketingEl = document.getElementById('signupMarketingConsent');
                const marketingConsent = !!(marketingEl && marketingEl.checked);
                if (p.length < 6 || p.length > 12) { showToast('Password must be 6-12 characters.'); return; }
                if (p !== p2) { showToast('Passwords do not match.'); return; }
                const email = emailInput || (u.includes('@') ? u : u + '@nutritrack.local');
                if (sb) {
                    const { error } = await sb.auth.signUp({ email, password: p, options: { emailRedirectTo: window.location.origin } });
                    if (error) { showToast(error.message); return; }
                    localStorage.setItem('nutri_terms_accepted', JSON.stringify({ version: '2026-01', timestamp: new Date().toISOString(), marketing: marketingConsent }));
                    showToast('Account created. Check your email to confirm, then log in.');
                    return;
                }
                // local fallback
                const users = getUsers();
                if (users[u]) { showToast('Username taken.'); return; }
                users[u] = hashPass(p);
                saveUsers(users);
                try {
                    const emails = JSON.parse(localStorage.getItem('nutri_user_emails') || '{}');
                    emails[u] = email;
                    localStorage.setItem('nutri_user_emails', JSON.stringify(emails));
                } catch (err) {}
                localStorage.setItem('nutri_terms_accepted', JSON.stringify({ version: '2026-01', timestamp: new Date().toISOString(), marketing: marketingConsent }));
                localStorage.setItem('nutri_current_user', u);
                enterApp();
            } catch (err) {
                showToast('Sign up failed: ' + (err && err.message ? err.message : err));
            }
        }
        async function handleLogin(e) {
            if (e && e.preventDefault) e.preventDefault();
            try {
                const sb = getSB();
                const u = document.getElementById('loginUser').value.trim();
                const p = document.getElementById('loginPass').value;
                if (sb) {
                    const email = u.includes('@') ? u : u + '@nutritrack.local';
                    const { error } = await sb.auth.signInWithPassword({ email, password: p });
                    if (error) { showToast(error.message); return; }
                    localStorage.setItem('nutri_current_user', u);
                    enterApp();
                    await pullState();
                    return;
                }
                const users = getUsers();
                if (!users[u] || users[u] !== hashPass(p)) { showToast('Invalid credentials.'); return; }
                localStorage.setItem('nutri_current_user', u);
                enterApp();
            } catch (err) {
                showToast('Login failed: ' + (err && err.message ? err.message : err));
            }
        }
        async function logout() {
            const sb = getSB();
            if (sb) await sb.auth.signOut();
            localStorage.removeItem('nutri_current_user');
            location.reload();
        }

        function togglePass(id, btn) {
            const input = document.getElementById(id);
            if (!input) return;
            if (input.type === 'password') { input.type = 'text'; btn.querySelector('i').className = 'fa-solid fa-eye-slash'; }
            else { input.type = 'password'; btn.querySelector('i').className = 'fa-solid fa-eye'; }
        }
        function checkPassMatch() {
            const p = document.getElementById('signupPass').value;
            const p2 = document.getElementById('signupPass2').value;
            const msg = document.getElementById('passMatchMsg');
            if (!msg) return;
            if (p2.length > 0 && p !== p2) msg.classList.remove('hidden');
            else msg.classList.add('hidden');
        }
        // override enterApp to also pull state
        const _enterApp = enterApp;
        enterApp = async function() {
            _enterApp();
            updateUserDisplay();
            await pullState();
        };
        // auto-login via Supabase session
        async function initAuth() {
            const sb = getSB();
            // surface OAuth errors returned in the URL
            try {
                const qs = window.location.search || '';
                const hash = window.location.hash || '';
                const params = new URLSearchParams((qs + '&' + hash.replace(/^#/, '')).replace(/^&/, ''));
                const err = params.get('error_description') || params.get('error');
                if (err) showToast(decodeURIComponent(String(err).replace(/\+/g, ' ')));
            } catch (e) {}
            if (sb) {
                try {
                    if (window.location.search.includes('code=') && typeof sb.auth.exchangeCodeForSession === 'function') {
                        await sb.auth.exchangeCodeForSession(window.location.href);
                    }
                    const { data: { session }, error } = await sb.auth.getSession();
                    if (error) { console.error(error); showToast('Auth error: ' + error.message); }
                    if (session) {
                        localStorage.setItem('nutri_current_user', session.user.email);
                        if (window.location.search || window.location.hash) {
                            try { window.history.replaceState({}, document.title, window.location.pathname); } catch (e) {}
                        }
                        enterApp();
                        return;
                    }
                } catch (e) {
                    console.error(e);
                    showToast('Auth error: ' + (e && e.message ? e.message : e));
                }
            }
            const u = localStorage.getItem('nutri_current_user');
            if (u && (getUsers()[u] || (sb && true))) {
                if (!sb) enterApp();
                else document.getElementById('authScreen').classList.remove('hidden');
            } else {
                document.getElementById('authScreen').classList.remove('hidden');
                document.getElementById('appShell').classList.add('hidden');
            }
        }
        window.handleLogin = handleLogin;
        window.handleSignup = handleSignup;
        window.signInWithGoogle = signInWithGoogle;

        async function signInWithGoogle() {
            const sb = getSB();
            if (!sb) { showToast('Configure Supabase in Settings to use Google sign-in.'); try { openSettings(); } catch (e) {} return; }
            try {
                const { data, error } = await sb.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin, queryParams: { access_type: 'offline', prompt: 'consent' } }
                });
                if (error) {
                    const msg = (error.message || '').toLowerCase();
                    if (msg.includes('unsupported provider') || msg.includes('provider is not enabled')) {
                        showToast('Google sign-in is not enabled in your Supabase project. Enable Google under Authentication → Providers in Supabase.');
                    } else {
                        showToast('Google sign-in failed: ' + error.message);
                    }
                    return;
                }
                if (data && data.url) { window.location.assign(data.url); return; }
                if (!data || !data.url) { showToast('Google sign-in did not start. Check Supabase Google provider settings.'); }
            } catch (e) {
                showToast('Google sign-in error: ' + (e && e.message ? e.message : e));
            }
        }

(function(){ try { initAuth(); } catch(e){} })();
