// The Finance page itself, rendered inside the manager's own shell — see the section
// layout for why sharing it is safe. Re-exported rather than copied so the two roles can
// never drift apart.
export { default } from '@/app/finance/(dashboard)/accounts/card-settlements/page';
