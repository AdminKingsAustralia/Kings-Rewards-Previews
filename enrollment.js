(function (root, factory) {
    'use strict';
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else {
        root.KingsEnrollmentUI = {
            mount: function (container, options) { return api.mount(root, root.document, container, root.KingsEnrollment || {}, options); }
        };
        var start = function () {
            root.document.querySelectorAll('[data-kr-enrollment]').forEach(function (container) {
                root.KingsEnrollmentUI.mount(container, { source: container.getAttribute('data-source') });
            });
        };
        if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
    }
}(typeof window !== 'undefined' ? window : this, function () {
    'use strict';
    var sequence = 0;

    function source(value) { return ['website', 'event', 'shop'].indexOf(value) !== -1 ? value : 'website'; }
    function normalisePhone(value) {
        var phone = String(value || '').trim().replace(/[\s().-]/g, '');
        if (/^0[2378][0-9]{8}$/.test(phone) || /^04[0-9]{8}$/.test(phone)) phone = '+61' + phone.slice(1);
        if (phone.indexOf('+61') === 0 && !/^\+61[23478][0-9]{8}$/.test(phone)) return '';
        return /^\+[1-9][0-9]{7,14}$/.test(phone) ? phone : '';
    }
    function validate(values) {
        if (!String(values.full_name || '').trim() || String(values.full_name).length > 100) return 'Please enter your full name (up to 100 characters).';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email || '').trim()) || String(values.email).length > 100) return 'Please enter a valid email address.';
        if (String(values.phone || '').trim() && !normalisePhone(values.phone)) return 'Please enter an Australian phone number or an international number beginning with +.';
        if (values.sms_marketing && !normalisePhone(values.phone)) return 'Please enter a phone number for SMS offers, or deselect SMS marketing.';
        if (!values.agreement) return 'Please confirm that you would like to join KINGS Rewards.';
        return '';
    }
    function localUrl(value, base) {
        try {
            var url = new URL(value, base);
            return ['http:', 'https:'].indexOf(url.protocol) !== -1 && url.origin === new URL(base).origin ? url.href : '';
        } catch (error) { return ''; }
    }
    async function submit(win, config, values) {
        var error = validate(values);
        if (error) throw new Error(error);
        if (config.demo === true) return { demo: true };
        var endpoint = config.endpoint && localUrl(config.endpoint, win.location.href);
        var stateUrl = config.stateUrl && localUrl(config.stateUrl, win.location.href);
        if (!endpoint || !stateUrl || typeof win.fetch !== 'function') throw new Error('Signup is unavailable right now. Please ask the KINGS team for help.');
        var stateResponse = await win.fetch(stateUrl, { credentials: 'same-origin', cache: 'no-store', redirect: 'error' });
        if (!stateResponse.ok) throw new Error('Unable to start signup. Please try again.');
        var payload = await stateResponse.json();
        var state = payload && payload.success === true && payload.data;
        if (!state || !state.enabled || state.blocked || typeof state.nonce !== 'string' || !state.nonce) throw new Error((state && state.message) || 'Signup is unavailable in this session. Please use a signed-out device.');
        var body = new URLSearchParams({ action: 'kr_enroll', nonce: state.nonce,
            full_name: values.full_name.trim(), email: values.email.trim(), phone: normalisePhone(values.phone),
            email_marketing: values.email_marketing ? '1' : '0', sms_marketing: values.sms_marketing ? '1' : '0',
            agreement: '1', website: values.website || '', source: source(values.source) });
        var response = await win.fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: body.toString() });
        var result = await response.json();
        if (!response.ok || !result || result.success !== true) throw new Error((result && result.data && result.data.message) || 'We could not complete signup. Please try again.');
        return { demo: false };
    }

    function mount(win, doc, container, config, options) {
        options = options || {};
        if (container.__krEnrollment) return container.__krEnrollment;
        var channel = source(options.source || config.source);
        var kiosk = channel === 'event' || channel === 'shop';
        var id = 'kr-enroll-' + (++sequence) + '-';
        var alive = true, busy = false, resetTimer = null, idleTimer = null;
        var inputs = {};
        function el(tag, className, text) {
            var node = doc.createElement(tag);
            if (className) node.className = className;
            if (text != null) node.textContent = text;
            return node;
        }
        var wrapper = el('div', 'kr-enrollment');
        var form = el('form', 'kr-enrollment-form');
        form.setAttribute('autocomplete', kiosk ? 'off' : 'on');
        form.setAttribute('aria-label', 'Join KINGS Rewards');
        // Prevent accidental native GET submission if script handlers are interrupted.
        form.method = 'post';
        function field(name, labelText, type, hint) {
            var label = el('label', 'kr-field', labelText);
            var input = el('input');
            input.name = name; input.id = id + name; input.type = type; input.required = name !== 'phone';
            input.maxLength = name === 'full_name' ? 100 : name === 'email' ? 100 : 30;
            input.autocomplete = kiosk ? 'off' : name === 'full_name' ? 'name' : type === 'email' ? 'email' : 'tel';
            if (type === 'tel') input.inputMode = 'tel';
            label.appendChild(input);
            if (hint) { var note = el('span', 'kr-field-hint', hint); note.id = id + name + '-hint'; input.setAttribute('aria-describedby', note.id); label.appendChild(note); }
            form.appendChild(label); inputs[name] = input;
        }
        field('full_name', 'Full name', 'text');
        field('email', 'Email address', 'email');
        field('phone', 'Phone number', 'tel', options.hidePhoneHint ? '' : 'Australian or international number, e.g. 0412 345 678.');
        function choice(name, text, required) {
            var label = el('label', 'kr-choice');
            var input = el('input'); input.type = 'checkbox'; input.name = name; input.id = id + name; input.required = Boolean(required);
            label.appendChild(input); label.appendChild(el('span', '', text)); form.appendChild(label); inputs[name] = input;
        }
        form.appendChild(el('p', 'kr-consent-title', 'Keep me in the loop (optional)'));
        choice('email_marketing', 'I agree to receive promotional emails from Kings Meat Co.', false);
        choice('sms_marketing', 'I agree to receive promotional SMS messages from Kings Meat Co.', false);
        var honey = el('input', 'kr-honeypot'); honey.type = 'text'; honey.name = 'website'; honey.tabIndex = -1; honey.autocomplete = 'off'; honey.setAttribute('aria-hidden', 'true'); form.appendChild(honey);
        var note = el('p', 'kr-privacy-note', 'By clicking Join KINGS Rewards, you agree to join the free program. Email and SMS marketing are separate, optional choices.');
        var privacyUrl = config.privacyUrl && localUrl(config.privacyUrl, win.location.href);
        if (privacyUrl) { note.appendChild(doc.createTextNode(' ')); var privacy = el('a', '', 'Privacy policy'); privacy.href = privacyUrl; privacy.target = '_blank'; privacy.rel = 'noopener noreferrer'; note.appendChild(privacy); }
        form.appendChild(note);
        if (config.demo) form.appendChild(el('p', 'kr-demo-note', 'DEMO ONLY · Try sample details. Nothing is saved or sent, and no email will be delivered.'));
        var status = el('p', 'kr-form-status'); status.setAttribute('role', 'alert'); status.id = id + 'status'; form.appendChild(status);
        var button = el('button', 'kr-enrollment-submit', 'Join KINGS Rewards — it’s free'); button.type = 'submit'; form.appendChild(button);
        if (kiosk) {
            var clearButton = el('button', 'kr-enrollment-clear', 'Clear form / next guest');
            clearButton.type = 'button'; clearButton.addEventListener('click', function () { if (!busy) reset(); }); form.appendChild(clearButton);
            form.appendChild(el('p', 'kr-privacy-note', 'For your privacy, unfinished details clear after 2 minutes without typing.'));
        } else {
            var accountUrl = config.accountUrl && localUrl(config.accountUrl, win.location.href);
            if (accountUrl) {
                var accountNote = el('p', 'kr-privacy-note');
                var account = el('a', 'kr-account-link', 'Already have an account? Sign in / manage membership');
                account.href = accountUrl; accountNote.appendChild(account); form.appendChild(accountNote);
            }
        }
        wrapper.appendChild(form); container.appendChild(wrapper);
        function clear() { form.reset(); honey.value = ''; Object.keys(inputs).forEach(function (key) { if (inputs[key].type === 'checkbox') inputs[key].checked = false; else inputs[key].value = ''; }); }
        function reset() {
            if (!alive) return;
            if (resetTimer !== null) win.clearTimeout(resetTimer);
            resetTimer = null;
            if (idleTimer !== null) win.clearTimeout(idleTimer);
            idleTimer = null;
            var thankYou = wrapper.querySelector('.kr-thanks');
            if (thankYou) thankYou.remove();
            wrapper.setAttribute('data-success', 'false');
            clear(); form.hidden = false; status.textContent = ''; button.disabled = false; busy = false;
            inputs.full_name.focus();
        }
        function idleReset() {
            if (!alive || !kiosk || form.hidden) return;
            if (idleTimer !== null) win.clearTimeout(idleTimer);
            idleTimer = win.setTimeout(function () {
                idleTimer = null;
                if (busy) { idleReset(); return; }
                reset();
            }, 120000);
        }
        if (kiosk) {
            form.addEventListener('input', idleReset);
            form.addEventListener('change', idleReset);
        }
        function success(result, fullName) {
            if (idleTimer !== null) win.clearTimeout(idleTimer);
            idleTimer = null;
            var firstName = String(fullName || '').trim().split(/\s+/)[0] || 'Friend';
            var letters = typeof Intl !== 'undefined' && Intl.Segmenter ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(firstName), function (x) { return x.segment; }) : Array.from(firstName);
            clear(); form.hidden = true;
            wrapper.setAttribute('data-success', 'true');
            var thanks = el('section', 'kr-thanks'); thanks.tabIndex = -1; thanks.setAttribute('aria-label', 'Signup received');
            var confetti = el('div', 'kr-confetti-shower'); confetti.setAttribute('aria-hidden', 'true');
            for (var i = 0; i < 42; i++) {
                var piece = el('i', 'kr-confetti-piece');
                piece.style.setProperty('--x', ((i * 37 + 11) % 100) + '%');
                piece.style.setProperty('--delay', ((i % 12) * .09) + 's');
                piece.style.setProperty('--duration', (2.3 + (i % 7) * .17) + 's');
                piece.style.setProperty('--drift', (((i % 9) - 4) * 17) + 'px');
                piece.style.setProperty('--turn', (270 + i * 31) + 'deg');
                piece.style.setProperty('--shade', ['#ff7900', '#ffcc80', '#fff2d9', '#d59539'][i % 4]);
                confetti.appendChild(piece);
            }
            thanks.appendChild(confetti);
            thanks.appendChild(el('h2', 'kr-thanks-heading', 'Thank you,'));
            var name = el('div', 'kr-personal-name'); name.setAttribute('aria-label', firstName); name.setAttribute('dir', 'auto');
            name.style.setProperty('--name-size', letters.length > 14 ? '32px' : letters.length > 10 ? '44px' : '68px');
            var initial = el('span', 'kr-name-initial', letters[0]); initial.setAttribute('aria-hidden', 'true');
            var crownUrl = config.crownUrl && localUrl(config.crownUrl, win.location.href);
            if (crownUrl) { var crown = el('img', 'kr-name-crown'); crown.src = crownUrl; crown.alt = ''; initial.appendChild(crown); }
            name.appendChild(initial);
            var rest = el('span', 'kr-name-rest', letters.slice(1).join('')); rest.setAttribute('aria-hidden', 'true'); name.appendChild(rest);
            thanks.appendChild(name);
            thanks.appendChild(el('p', 'kr-thanks-subtitle', 'for joining KINGS Rewards.'));
            thanks.appendChild(el('p', 'kr-thanks-copy', result.demo ? 'This is your welcome-screen preview. No account was created, no details were saved and no email was sent.' : 'If this email is new, check your inbox for account setup and membership verification. Your email explains how KINGS Rewards works. Already have an account? Sign in on your own device to manage your membership.'));
            if (!result.demo) thanks.appendChild(el('p', 'kr-privacy-note', 'Complete the email steps to activate your membership. Check your spam folder if needed.'));
            if (kiosk) {
                thanks.appendChild(el('p', 'kr-privacy-note', 'Your form details have been cleared. This welcome resets in 30 seconds.'));
                var next = el('button', 'kr-enrollment-submit', 'Next guest →'); next.type = 'button'; next.addEventListener('click', reset); thanks.appendChild(next);
                resetTimer = win.setTimeout(reset, 30000);
            } else if (typeof options.onContinue === 'function') {
                var cont = el('button', 'kr-enrollment-submit', 'Continue shopping →'); cont.type = 'button'; cont.addEventListener('click', options.onContinue); thanks.appendChild(cont);
            }
            if (!kiosk && accountUrl) {
                var manageNote = el('p', 'kr-privacy-note');
                var manage = el('a', 'kr-account-link', 'Already have an account? Sign in / manage membership');
                manage.href = accountUrl; manageNote.appendChild(manage); thanks.appendChild(manageNote);
            }
            thanks.appendChild(el('p', 'kr-thanks-eyebrow', 'YOU’RE IN GOOD COMPANY'));
            wrapper.appendChild(thanks);
            if (typeof options.onSuccess === 'function') options.onSuccess(result);
            thanks.focus();
        }
        form.addEventListener('submit', async function (event) {
            event.preventDefault(); if (busy || !alive) return;
            var values = { full_name: inputs.full_name.value, email: inputs.email.value, phone: inputs.phone.value, agreement: true, email_marketing: inputs.email_marketing.checked, sms_marketing: inputs.sms_marketing.checked, website: honey.value, source: channel };
            var error = validate(values);
            if (error) { status.textContent = error; return; }
            busy = true; button.disabled = true; if (kiosk) clearButton.disabled = true; form.setAttribute('aria-busy', 'true'); status.textContent = 'Preparing your membership…';
            try { var result = await submit(win, config, values); if (alive) success(result, values.full_name); }
            catch (error) { if (alive) status.textContent = error instanceof Error ? error.message : 'Signup could not be completed. Please try again.'; }
            finally { values = null; if (alive) { busy = false; button.disabled = false; if (kiosk) clearButton.disabled = false; form.setAttribute('aria-busy', 'false'); } }
        });
        var api = { focus: function () { inputs.full_name.focus(); }, destroy: function () { alive = false; if (resetTimer !== null) win.clearTimeout(resetTimer); if (idleTimer !== null) win.clearTimeout(idleTimer); clear(); wrapper.remove(); container.__krEnrollment = null; } };
        container.__krEnrollment = api;
        return api;
    }
    return { normalisePhone: normalisePhone, validate: validate, source: source, localUrl: localUrl, submit: submit, mount: mount };
}));
