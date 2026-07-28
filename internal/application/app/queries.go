package app

type GetAppQuery struct {
	ID string
}

type ListAppsQuery struct{}

type ListByOwnerQuery struct {
	OwnerEmail string
}
