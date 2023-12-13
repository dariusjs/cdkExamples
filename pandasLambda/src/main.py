import pandas


# python function for a lambda handler that responds with hello world
def lambda_handler(event, context):
    data = pandas.DataFrame(data=[1, 2, 3, 4, 5])
    return data.to_json()
