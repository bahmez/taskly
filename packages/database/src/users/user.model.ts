export type UserAvatarBackgroundImage = {
  source: 'unsplash';
  id: string;
  url: string;
  thumbUrl: string;
  blurHash?: string | null;
  color?: string | null;
  authorName?: string | null;
  authorUrl?: string | null;
};

export type UserAvatarBackground =
  | { type: 'color'; value: string }
  | { type: 'gradient'; value: string }
  | { type: 'image'; value: UserAvatarBackgroundImage };

export type UserAvatarImage = {
  source: 'upload';
  objectPath: string;
};

export type UserAvatar =
  | { type: 'initials'; background: UserAvatarBackground | null }
  | { type: 'image'; image: UserAvatarImage };

export type UserModel = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  description: string;
  avatar: UserAvatar | null;
  createdAt: string;
  updatedAt: string;
};

export type UserCreateInput = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  description?: string;
  avatar?: UserAvatar | null;
};

export type UserUpdateInput = Partial<
  Pick<UserModel, 'username' | 'first_name' | 'last_name' | 'description' | 'avatar'>
>;


