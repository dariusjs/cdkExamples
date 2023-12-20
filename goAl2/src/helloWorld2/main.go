// main.go
package main

import (
	"github.com/aws/aws-lambda-go/lambda"
)

func handler() (string, error) {
	return "Hello ƛ!", nil
}

func main() {
	// Make the handler available for Remote Procedure Call by AWS Lambda
	// lambda.Start(hello)
	lambda.Start(handler)
}