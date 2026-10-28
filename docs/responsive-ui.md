# Responsive UI verification

Reviewed the document list, people list, person view, case view, document detail,
new-document form and admin settings at 320px, 375px and 768px viewport widths.
The browser preview uses sample records because local Auth0 is not configured.

- Main navigation wraps onto a second row on phones.
- Case document previews keep portrait proportions and fit two columns at 320px.
- Document details and form groups stack into one column below their breakpoints.
- Admin navigation uses a vertical list above the active panel on phones and a
  sidebar beside the active panel at 1024px and above. Keyboard navigation follows
  the vertical tab orientation, with 44px minimum targets.
- Long names, emails and case titles were checked for horizontal page overflow.
  Breadcrumbs truncate visually while retaining their complete accessible labels.
- Person/case creation dialogs are limited by the dynamic viewport height and scroll
  internally, keeping the create action reachable on short screens.
- Long select options wrap within the viewport; relationship links and badges wrap.

Layout overrides are applied at shadcn component call sites. Registry component
implementations and application authorization are unchanged.
