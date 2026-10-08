# LensVaultPro – offline copy of the public pages

An offline copy of the public part of the Base44 app at https://lens-vault.base44.app: the landing page and the login/sign-up screens.

* The landing page runs the **original app bundle**. A small local mock (`shim.js`) returns the same "signed-out" API responses as the live site, so the page looks and behaves the same: the English/Hebrew (RTL) toggle, animations, the CTA buttons that open the login screen, and contact-form validation with its sending and success states.
* **Nothing is sent anywhere.** The contact form and the login, sign-up and password-reset forms only show their validation and loading states. No message, email or credential leaves the browser.
* The signed-in part of the app (equipment, kits, rentals and so on) needs a real account and is not included.
* Search indexing is turned off (`noindex`). This copy is not affiliated with Base44 or the original app's operator.
