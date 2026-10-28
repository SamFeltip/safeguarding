import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useApi } from '@/lib/api';
import { accountPermissions, invitationResultSchema } from '../../shared/invitations';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Failure } from './feedback';

const labels: Record<(typeof accountPermissions)[number], string> = {
  'create:documents': 'Create people, cases and documents',
  'read:documents:company': 'Read company records',
  'read:documents:hr': 'Read HR records',
  'read:documents:all': 'Administrator: all records, backups and account invitations',
};
export function InvitationPanel() {
  const api = useApi();
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['read:documents:company']);
  const invite = useMutation({
    mutationFn: () =>
      api('/admin/invitations', invitationResultSchema, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, permissions }),
      }),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite an account</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            invite.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              autoComplete="off"
              onChange={(event) => {
                setEmail(event.target.value);
                invite.reset();
              }}
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="mb-3 font-medium">Permissions</legend>
            {accountPermissions.map((permission) => (
              <label key={permission} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={permissions.includes(permission)}
                  onChange={(event) => {
                    setPermissions((current) =>
                      event.target.checked
                        ? [...current, permission]
                        : current.filter((value) => value !== permission),
                    );
                    invite.reset();
                  }}
                />
                <span>{labels[permission]}</span>
              </label>
            ))}
          </fieldset>
          <p className="text-sm text-muted-foreground">
            The recipient receives an Auth0 password-setup email. After setting a password, they
            sign in and enroll an authenticator app. Auth0 also offers optional passkey setup.
            Existing accounts with the same permissions can be invited again.
          </p>
          <Button disabled={invite.isPending || permissions.length === 0}>
            {invite.isPending ? 'Sending…' : 'Create account and send invitation'}
          </Button>
          {invite.isSuccess ? <p role="status">Invitation sent to {invite.data.email}.</p> : null}
          {invite.isError ? <Failure error={invite.error} /> : null}
        </form>
      </CardContent>
    </Card>
  );
}
