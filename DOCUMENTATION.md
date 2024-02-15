# Documentation

## How to integrate into a project.

First follow the setup in the main readme.
In the future, either redirect your users to that as well, or make the integration automate the setup.

Once you have the setup completed, you will need to run `node index.js`, using your integration, inside the installation directory.
For testing, you can also start it from a terminal, and send the inputs and outputs manually.

Now you will need to implement the protocol. For most requests to work, you will need to be logged in first.

## Protocol

Each request you send, happens using the standard input. You always send JSON encoded object, and then single newline.
All sent JSON objects have the following format:

```json
{
    "id": number,
    "data": Payload
}
```

The `id` is an identifier, sent for each request, and returned in the response(s) corresponding to that request.
The payload depends on what you are doing.

## Request Types

### Authentication Url

Request Payload:

```json
{
    "type": "auth_url"
}
```

For this request, the response consists of just a string representing an url for the user to open, to get their authentication token.

### Authentication Login

Request Payload:

```json
{
    "type": "auth_login",
    "token": "The authentication token."
}
```

The response for this request, simply is either "success" or "failure".
The authentication token will be stored, so this is only needed once.

### Authentication Status

Request Payload:

```json
{
    "type": "has_auth"
}
```

For this, the response is simply a boolean indicating if the user already has an api key stored.

### Fetching Code Completions

Request Payload:

```json
{
    "type": "fetch_completions",
    "prefix": "Entire code before of the caret.",
    "suffix": "Entire code after the caret.",
    "file": "The absolute path to the current file."
}
```

The response payload consists of a JSON object, with key value pairs. Each key represents a completion id, and each value the newly generated text for that completion. Completions are streaming based and each response will only contain a small chunk of the entire completion.

### Fetching Chat Messages

Request Payload:

```json
{
    "prompt": "The chat history.",
    "system": "An optional system prompt."
}
```

The chat history takes this format, as often as needed:

```
User:
<message>
Assistant:
<response>
```

The response for this request is a bunch of strings, of text to append to the end of the assistant's response.

### Specifing the Index Working Directory

Request Payload:

```json
{
    "type": "index_cwd",
    "cwd": "The full path to the directory the user is in."
}
```

This request loads all indexes associated to files inside that path. And responds with "ok"
If this request is not sent, then none of the context aware code will run.

### Creating/Updating Indexes for a Directory/File

The request payload for indexing files and directories is the same, just with one being `index_file` and `file`, and the other `index_dir` and `dir`, for example for a file it is:

```json
{
    "type": "index_file",
    "file": "Absolute path to the file."
}
```

The response to this will be "ok";

## .codeiumignore

Users can specify files to be excluded inside their `.codeiumignore` file, which must be put into the current working directory.
Each line of the file must be one of three types:
- Comments: Lines starting with a `#`.
- Ignore Statements:
    - A path to a file or directory, relative to the current working directory.
    - No leading or trailing slashes.
    - Slashes must be `/` (not `\`)
    - Can contain `*` which matches anything. 
- Empty lines do nothing.
For a basic example, you can view this repositories `.codeiumignore`.
If the file was changed, the cwd needs to be re-sent, in order to apply the changes.
