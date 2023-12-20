# Deploy 3 Go Lambda Functions with AL2 and AL2023 using Go 1.18.8

Requirements:
* locally installed go 1.18.8
* make sure your go.mod is up to date `go get -u`
* tested with go 1.18.8

What can go wrong:
* your go.sum could be containing incompatible versions so you should look into re-generating it
* run `go get -u` to get the latest packages which support the bootstrap required by the AL2 and AL2023 image 