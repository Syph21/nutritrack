
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
            e.preventDefault();
            const sb = getSB();
            const u = document.getElementById('signupUser').value.trim();
            const p = document.getElementById('signupPass').value;
            const p2 = document.getElementById('signupPass2').value;
            if (p.length < 6 || p.length > 12) { showToast('Password must be 6-12 characters.'); return; }
            if (p !== p2) { showToast('Passwords do not match.'); return; }
            if (sb) {
                const email = u.includes('@') ? u : u + '@nutritrack.local';
                const { error } = await sb.auth.signUp({ email, password: p, options: { emailRedirectTo: window.location.origin } });
                if (error) { showToast(error.message); return; }
                showToast('Account created. Check email if confirmation required.');
                return;
            }
            // local fallback
            const users = getUsers();
            if (users[u]) { showToast('Username taken.'); return; }
            users[u] = hashPass(p);
            saveUsers(users);
            localStorage.setItem('nutri_current_user', u);
            enterApp();
        }
        async function handleLogin(e) {
            e.preventDefault();
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
        }
        async function logout() {
            const sb = getSB();
            if (sb) await sb.auth.signOut();
            localStorage.removeItem('nutri_current_user');
            location.reload();
        }
        // override enterApp to also pull state
        const _enterApp = enterApp;
        enterApp = async function() {
            _enterApp();
            await pullState();
        };
        // auto-login via Supabase session
        async function initAuth() {
            const sb = getSB();
            if (sb) {
                const { data: { session } } = await sb.auth.getSession();
                if (session) { localStorage.setItem('nutri_current_user', session.user.email); enterApp(); return; }
            }
            const u = localStorage.getItem('nutri_current_user');
            if (u && (getUsers()[u] || (sb && true))) {
                // if supabase configured, require session; else local
                if (!sb) enterApp();
                else document.getElementById('authScreen').classList.remove('hidden');
            } else {
                document.getElementById('authScreen').classList.remove('hidden');
                document.getElementById('appShell').classList.add('hidden');
            }
        }
        // call initAuth instead of IIFE

        async function signInWithGoogle() {
            const sb = getSB();
            if (!sb) { showToast('Configure Supabase in Settings first.'); return; }
            await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
        }

(function(){ try { initAuth(); } catch(e){} })();
