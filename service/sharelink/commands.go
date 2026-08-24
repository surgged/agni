package sharelink

type CreateShareLinkCommand struct {
	ID             string
	AppID          string
	RecipientEmail string
	Permission     string
}

type AcceptShareLinkCommand struct {
	ID    string
	Token string
}

type RevokeShareLinkCommand struct {
	ID string
}
