import { FileText } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { ProfileMenu } from './profile-menu';

export function AppHeader() {
  return (
    <header>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Button asChild variant="ghost">
          <Link to="/">
            <FileText />
            People records
          </Link>
        </Button>
        <nav
          aria-label="Main navigation"
          className="order-last flex w-full flex-wrap items-center justify-center gap-1 sm:order-none sm:w-auto"
        >
          {['Documents', 'People', 'Cases'].map((label) => (
            <NavLink
              key={label}
              to={label === 'Documents' ? '/' : `/${label.toLowerCase()}`}
              end={label === 'Documents'}
            >
              {({ isActive }) => (
                <Button asChild variant={isActive ? 'secondary' : 'ghost'}>
                  <span>{label}</span>
                </Button>
              )}
            </NavLink>
          ))}
        </nav>
        <ProfileMenu />
      </div>
      <Separator />
    </header>
  );
}
