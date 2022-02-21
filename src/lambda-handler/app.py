import os
import boto3
import json
import requests
from requests_aws4auth import AWS4Auth


REGION   = os.getenv('AWS_REGION')
SERVICE  = 'es'
CREDS    = boto3.Session().get_credentials()
AWS_AUTH = AWS4Auth(CREDS.access_key, CREDS.secret_key, REGION, SERVICE, session_token=CREDS.token)
HEADERS  = { "Content-Type": "application/json" }
HOST     = os.getenv('SEARCH_DOMAIN') # The OpenSearch domain endpoint with https://
INDEX    = 'movies'


def search_handler(event):
    # Put the user query into the query DSL for more accurate search results.
    # Note that certain fields are boosted (^).
    query = {
        "size": 100,
        "sort": {
            "rating": {
                "order": "desc"
            }
        },
        "query": {
            "query_string": {
                "query": event['queryStringParameters']['q'],
                "type": "phrase",
                "fields": ["title^4", "plot^2", "actors", "directors"]
            }
        }
    }
    print(f'Receive query: {query}')

    url = HOST + '/' + INDEX + '/_search'
    r = requests.get(url, auth=AWS_AUTH, headers=HEADERS, data=json.dumps(query))

    # Create the response and add some extra content to support CORS
    response = {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": '*'
        },
        "isBase64Encoded": False
    }

    # Add the search results to the response
    data = [hit['_source'] for hit in r.json()['hits']['hits']]
    response['body'] = json.dumps(data)
    print(f'Query output: {json.dumps(data)}')
    return response


def index_handler(event):
    try:
        for record in event['Records']:
            _bucket = record['s3']['bucket']['name']
            _key = record['s3']['object']['key']
            print(f'Received event for bucket: {_bucket}, key: {_key}')
            client = boto3.client('s3')
            file_name = _key.split('/')[-1]
            client.download_file(_bucket, _key, f'/tmp/{file_name}')
            with open(f'/tmp/{file_name}', 'r') as f:
                data = f.read()

            url = HOST + '/' + INDEX + '/' + '_bulk'
            requests.post(url, auth=AWS_AUTH, data=data, headers=HEADERS)
    except Exception as err:
        print(f"Index error - {err}")
        return False


def handler(event, context):
    if 'Records' in event:
        index_handler(event)
    elif 'queryStringParameters' in event:
        res = search_handler(event)
        return res
    else:
        print(f"Not support event {event}")
        return '404'
