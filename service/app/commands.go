package app

type CreateAppCommand struct {
	ID         string
	OwnerEmail string
	Name       string
}

type QueueDeployCommand struct {
	ID         string
	ArchiveKey string
	Slug       string
	Port       int32
	Runtime    string
}

type MarkBuildingCommand struct {
	ID string
}

type MarkDeployingCommand struct {
	ID       string
	ImageRef string
	PodName  string
}

type MarkLiveCommand struct {
	ID         string
	ServiceURL string
	ShareURL   string
}

type MarkFailedCommand struct {
	ID     string
	Step   string
	Reason string
}

type DestroyAppCommand struct {
	ID string
}

type RetryDeployCommand struct {
	ID string
}
