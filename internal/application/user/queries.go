package user

// GetUserQuery is the application-layer request to fetch a single
// user by its identifier.
type GetUserQuery struct {
	ID string
}

// ListUsersQuery is the application-layer request to fetch every
// user. Add filter fields here as the model grows.
type ListUsersQuery struct {
}

// GetUserByEmailQuery is the application-layer request to fetch a
// single user by email address.
type GetUserByEmailQuery struct {
	Email string
}

