export type UserModel = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type UserCreateInput = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  description?: string;
};

export type UserUpdateInput = Partial<
  Pick<UserModel, 'username' | 'first_name' | 'last_name' | 'description'>
>;


