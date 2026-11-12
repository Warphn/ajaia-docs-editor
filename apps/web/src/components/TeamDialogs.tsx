import { useState, type FormEvent } from 'react';
import type { Team } from '../api/types';
import { useAddTeamMember, useCreateTeam } from '../hooks/use-teams';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Dialog } from './Dialog';

const inputClasses = 'h-9 min-w-0 flex-1 rounded-md border border-line-strong px-3 text-sm focus:border-primary';

interface CreateTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (team: Team) => void;
}

export function CreateTeamDialog({ isOpen, onClose, onCreated }: CreateTeamDialogProps) {
  const createTeam = useCreateTeam();
  const [name, setName] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createTeam.mutate(name.trim(), {
      onSuccess: (team) => {
        setName('');
        onCreated(team);
      },
    });
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="New team"
      description="A shared space for a project: everyone in the team can open and edit its documents."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="team-name">
          Team name
        </label>
        <input
          id="team-name"
          required
          maxLength={80}
          placeholder="e.g. Mobile app"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClasses}
        />
        <Button type="submit" disabled={!name.trim() || createTeam.isPending}>
          Create team
        </Button>
      </form>
      {createTeam.error && (
        <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {createTeam.error.message}
        </p>
      )}
    </Dialog>
  );
}

interface TeamMembersDialogProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
}

export function TeamMembersDialog({ team, isOpen, onClose }: TeamMembersDialogProps) {
  const addMember = useAddTeamMember(team.id);
  const [email, setEmail] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    addMember.mutate(email.trim(), { onSuccess: () => setEmail('') });
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${team.name} members`}
      description="Members can open and edit every document in this team."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="member-email">
          Email
        </label>
        <input
          id="member-email"
          type="email"
          required
          placeholder="teammate@ajaia.dev"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClasses}
        />
        <Button type="submit" disabled={!email.trim() || addMember.isPending}>
          Add member
        </Button>
      </form>
      {addMember.error && (
        <p role="alert" className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          {addMember.error.message}
        </p>
      )}

      <ul className="mt-4 divide-y divide-line rounded-md border border-line">
        {team.members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 px-3 py-2">
            <Avatar name={member.name} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{member.name}</span>
              <span className="block truncate text-xs text-ink-muted">{member.email}</span>
            </span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
