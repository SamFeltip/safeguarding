import { useAppAuth } from '@/hooks/use-app-auth';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LogOut, Settings, KeyRound } from 'lucide-react';
import { permissions } from '../../shared/documents';
import { usePermissions } from './identity';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function ProfileMenu() {
  const { user, signOut } = useAppAuth();
  const grants = usePermissions();
  const client = useQueryClient();
  const name = user?.name ?? user?.email ?? 'Profile';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open profile menu">
          <Avatar>
            <AvatarImage src={user?.picture} alt={name} />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="break-words">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account">
            <KeyRound /> Sign-in methods
          </Link>
        </DropdownMenuItem>
        {grants.includes(permissions.admin) ? (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <Settings />
              Admin settings
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onSelect={() => {
            client.clear();
            void signOut();
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
