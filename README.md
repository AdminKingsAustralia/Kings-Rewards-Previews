# KINGS Rewards — Team Previews

Interactive previews for KINGS Meat Co. Sample data only: no live memberships, orders, payments, emails or SMS.

## Open the previews

- [Team review hub](https://adminkingsaustralia.github.io/Kings-Rewards-Previews/)
- [Complete demo, including popup trigger](https://adminkingsaustralia.github.io/Kings-Rewards-Previews/team.html)
- [Event / in-store signup](https://adminkingsaustralia.github.io/Kings-Rewards-Previews/join.html)
- [Member rewards dashboard](https://adminkingsaustralia.github.io/Kings-Rewards-Previews/dashboard.html)
- [Website, signup popup and checkout](https://adminkingsaustralia.github.io/Kings-Rewards-Previews/shop.html)
- [Loom walkthrough](https://www.loom.com/share/b999e16e8e1c46eba234c44b7230fe16)

## Try it

Open the complete demo and click **Show signup popup**. Enter sample details to see the personalised welcome animation. On the dashboard, select sample balances and try rewards, purchases, completed deliveries and refunds. On the event signup page, the form resets after the thank-you screen for the next visitor.

## Build status

Preview based on KINGS Rewards plugin 0.3.3. The WooCommerce plugin is a separate staging-only build; this repository publishes its static previews only. It does not contain a deployable backend or customer database. WordPress/WooCommerce, real database, checkout and payment-provider acceptance tests remain required before production. Square POS loyalty synchronisation, communications delivery, referrals, birthdays, member pricing and VIP functionality are not live.

Program rules: 25% welcome discount, $50 minimum, maximum $40 saving; three eligible free deliveries on $50+ orders. Points: 500 = $10 off; 1,000 = $25 credit; 2,500 = $150 credit. Reward use requires verified identity in the live implementation; email entry alone is not authentication.

## Publishing and maintenance

GitHub Pages publishes `main` from `/ (root)`. All links use paths that work under the repository URL. The portable `team.html` includes all three demo views and can also be downloaded for offline review. `noindex` is a search-engine request, not access control: this demo is public.

Update the source plugin assets first, run its `tools/build-team-preview.py`, then copy only the preview HTML/JS and required public assets into this repository. Do not copy PHP, customer exports, keys or configuration secrets here.

KINGS branding and assets belong to KINGS. No open-source licence is granted by publishing this preview.
