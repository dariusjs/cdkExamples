def handler(event, context):
    object_size = event["source"]["data"]["ContentLength"]
    # calculate byte ranges of size 5242880 for an item that is 6442450944 large, output should be formatted like "bytes=0-5242880"
    byte_ranges = []
    dynamic_chunk = int(object_size / 10)
    for i in range(0, object_size, dynamic_chunk):
        if i + dynamic_chunk <= object_size:
            byte_ranges.append(f"bytes={i}-{i+dynamic_chunk}")
        else:
            byte_ranges.append(f"bytes={i}-{object_size-1}")
    return byte_ranges
