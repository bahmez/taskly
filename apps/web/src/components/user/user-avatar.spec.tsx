import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserAvatar } from '@/components/user/user-avatar';

describe('UserAvatar', () => {
  it('renders initials fallback when no image avatar is provided', () => {
    render(<UserAvatar user={{ first_name: 'Ada', last_name: 'Lovelace', username: 'ada' }} />);

    expect(screen.getByText('AL')).toBeInTheDocument();
    expect(screen.queryByAltText('avatar')).not.toBeInTheDocument();
  });

  it('renders image when avatar type is image', () => {
    render(
      <UserAvatar
        user={{
          first_name: 'Ada',
          last_name: 'Lovelace',
          username: 'ada',
          avatar: {
            type: 'image',
            image: { url: 'https://example.com/avatar.png' },
          } as never,
        }}
      />,
    );

    expect(screen.getByAltText('avatar')).toBeInTheDocument();
    expect(screen.queryByText('AL')).not.toBeInTheDocument();
  });
});
