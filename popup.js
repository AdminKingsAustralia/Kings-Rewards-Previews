(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        var api = factory();
        var start = function () { api.init(root, root.document, root.KingsRewards); };
        if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
        else start();
    }
}(typeof window !== 'undefined' ? window : this, function () {
    'use strict';

    function createSessionGate(win, doc, key) {
        var seen = false;
        var cookieName = encodeURIComponent(key);
        return function claim() {
            if (seen) return false;
            try { seen = doc.cookie.split(';').some(function (part) { return part.trim() === cookieName + '=1'; }); } catch (error) { /* Privacy settings may block cookies. */ }
            try { seen = seen || win.sessionStorage.getItem(key) === '1'; } catch (error) { /* Keep the in-memory gate if storage is unavailable. */ }
            if (seen) return false;
            seen = true;
            try { doc.cookie = cookieName + '=1; Path=/; SameSite=Lax' + (win.location.protocol === 'https:' ? '; Secure' : ''); } catch (error) { /* sessionStorage is the fallback. */ }
            try { win.sessionStorage.setItem(key, '1'); } catch (error) { /* The cookie still covers subsequent pages. */ }
            return true;
        };
    }

    function safeUrl(value, base, httpsOnly) {
        if (typeof value !== 'string' || !value.trim()) return '';
        try {
            var url = new URL(value, base);
            var localHttpAsset = httpsOnly && url.protocol === 'http:' && url.origin === new URL(base).origin;
            return (url.protocol === 'https:' || (!httpsOnly && url.protocol === 'http:') || localHttpAsset) ? url.href : '';
        } catch (error) { return ''; }
    }

    function init(win, doc, config) {
        if (!config || !config.enabled || (!config.stateUrl && config.isMember) || win.__kingsRewardsInitialized) return null;
        var joinUrl = safeUrl(config.joinUrl, win.location.href, false);
        if (!joinUrl) return null;
        var stateUrl = config.stateUrl ? safeUrl(config.stateUrl, win.location.href, false) : '';
        if (config.stateUrl && (!stateUrl || new URL(stateUrl).origin !== new URL(win.location.href).origin || typeof win.fetch !== 'function')) return null;
        win.__kingsRewardsInitialized = true;
        var claim = createSessionGate(win, doc, config.storageKey || 'kings_rewards_invitation_seen');
        var dialog = null;
        var enrollment = null;
        var previousFocus = null;
        var previousOverflow = '';
        var stateRequest = null;
        var pendingSuccess = false;

        function element(tag, className, text) {
            var node = doc.createElement(tag);
            if (className) node.className = className;
            if (text != null) node.textContent = String(text);
            return node;
        }

        function finishClose() {
            if (!dialog) return;
            if (enrollment) { enrollment.destroy(); enrollment = null; }
            dialog.remove();
            dialog = null;
            doc.body.style.overflow = previousOverflow;
            if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
        }

        function close() {
            if (!dialog) return;
            if (typeof dialog.close === 'function' && dialog.open) dialog.close();
            finishClose();
        }

        function show(previewOnly) {
            if (dialog || (previewOnly !== true && !claim())) return;
            previousFocus = doc.activeElement;
            previousOverflow = doc.body.style.overflow;
            dialog = element('dialog', 'kings-rewards-dialog');
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-labelledby', 'kings-rewards-heading');
            dialog.setAttribute('aria-modal', 'true');
            var panel = element('div', 'kings-rewards-panel');
            var dismiss = element('button', 'kings-rewards-close', '×');
            dismiss.type = 'button';
            dismiss.setAttribute('aria-label', config.closeLabel || 'Close rewards invitation');
            dismiss.addEventListener('click', close);
            panel.appendChild(dismiss);

            var masthead = element('div', 'kings-rewards-masthead');
            var logoUrl = safeUrl(config.logoUrl, win.location.href, true);
            if (logoUrl) {
                var logo = element('img', 'kings-rewards-logo');
                logo.src = logoUrl;
                logo.alt = config.logoAlt || 'KINGS Meat Co.';
                masthead.appendChild(logo);
            } else {
                var mark = element('span', 'kings-rewards-mark', 'K');
                mark.setAttribute('aria-hidden', 'true');
                masthead.appendChild(mark);
            }
            masthead.appendChild(element('span', 'kings-rewards-eyebrow', config.eyebrow || 'KINGS REWARDS'));
            panel.appendChild(masthead);
            var headline = config.heading || 'Would you like to join KINGS Rewards and get 25% off your first order plus three free deliveries?';
            var heading = element('h2', 'kings-rewards-heading');
            // Keep configurable copy as text; never interpret it as HTML.
            var parts = headline.split(/(25% off|three free deliveries)/gi);
            if (parts.length === 1) heading.textContent = headline;
            else parts.forEach(function (part) {
                var highlight = /^25% off$/i.test(part) ? 'kings-rewards-highlight-discount' : /^three free deliveries$/i.test(part) ? 'kings-rewards-highlight-delivery' : '';
                heading.appendChild(element('span', highlight, part));
            });
            heading.id = 'kings-rewards-heading';
            panel.appendChild(heading);
            var join;
            if (win.KingsEnrollmentUI && typeof win.KingsEnrollmentUI.mount === 'function') {
                var mount = element('div', 'kings-rewards-enrollment');
                panel.appendChild(mount);
                enrollment = win.KingsEnrollmentUI.mount(mount, {
                    source: 'website',
                    hidePhoneHint: true,
                    onContinue: close,
                    onSuccess: function () {
                        masthead.hidden = true;
                        guest.hidden = true;
                        if (terms) terms.hidden = true;
                        heading.hidden = true;
                    }
                });
            } else {
                join = element('a', 'kings-rewards-join', config.joinLabel || 'Join KINGS Rewards');
                join.href = joinUrl;
                panel.appendChild(join);
            }
            var guest = element('button', 'kings-rewards-guest', config.guestLabel || 'Continue as guest');
            guest.type = 'button';
            guest.addEventListener('click', close);
            panel.appendChild(guest);
            var terms;
            if (config.terms) { terms = element('p', 'kings-rewards-terms', config.terms); panel.appendChild(terms); }
            dialog.appendChild(panel);
            dialog.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
            dialog.addEventListener('close', finishClose);
            dialog.addEventListener('click', function (event) { if (event.target === dialog) close(); });
            dialog.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') { event.preventDefault(); close(); return; }
                if (event.key !== 'Tab') return;
                var items = dialog.querySelectorAll ? Array.prototype.filter.call(dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]'), function (item) {
                    return !item.disabled && item.tabIndex !== -1 && !item.hidden && !item.closest('[hidden]');
                }) : [dismiss, join, guest];
                var index = items.indexOf(doc.activeElement);
                if (event.shiftKey && index <= 0) { event.preventDefault(); items[items.length - 1].focus(); }
                else if (!event.shiftKey && (index === items.length - 1 || index === -1)) { event.preventDefault(); items[0].focus(); }
            });
            doc.body.appendChild(dialog);
            doc.body.style.overflow = 'hidden';
            if (typeof dialog.showModal === 'function') dialog.showModal();
            else { dialog.setAttribute('open', ''); dialog.classList.add('kings-rewards-fallback'); }
            if (enrollment) dismiss.focus();
            else join.focus();
        }

        function refreshState(cartSucceeded) {
            pendingSuccess = pendingSuccess || cartSucceeded;
            if (stateRequest) return stateRequest;
            // Member and cart state must bypass cached storefront HTML.
            stateRequest = Promise.resolve().then(function () {
                return win.fetch(stateUrl, { credentials: 'same-origin', cache: 'no-store', redirect: 'error' });
            }).then(function (response) {
                if (!response.ok) throw new Error('Rewards state unavailable');
                return response.json();
            }).then(function (payload) {
                var state = payload && payload.success === true && payload.data;
                if (state && state.enabled === true && state.isMember === false && typeof state.hasAddedToCart === 'boolean' && (pendingSuccess || state.hasAddedToCart)) show();
            }).catch(function () { /* Suppress invitations when current membership cannot be verified. */ }).then(function () {
                pendingSuccess = false;
                stateRequest = null;
            });
            return stateRequest;
        }

        function onSuccess() {
            if (stateUrl) return refreshState(true);
            show();
        }

        // Manual presentation control exists only in an explicitly simulated preview.
        if (config.demo === true && win.KingsEnrollment && win.KingsEnrollment.demo === true && !stateUrl) {
            doc.addEventListener('kings-rewards-preview-open', function () { show(true); });
        }

        // Both WooCommerce event families may report the same successful cart addition.
        doc.addEventListener('wc-blocks_added_to_cart', onSuccess);
        if (win.jQuery) win.jQuery(doc.body).on('added_to_cart.kingsRewards', onSuccess);
        if (stateUrl) refreshState(false);
        else if (config.hasAddedToCart) show();
        return { onSuccess: onSuccess, close: close };
    }

    return { createSessionGate: createSessionGate, safeUrl: safeUrl, init: init };
}));
