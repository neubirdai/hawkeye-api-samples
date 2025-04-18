import requests
import logging
import uuid

class Hawkeye:
    def __init__(self, name: str, url: str, user: str, password: str):
        # initialize logger
        self.logger = logging.getLogger(self.__class__.__name__)
        self.name = name
        self.user = user
        self.password = password
        self.url = url.rstrip("/")
        self.project_uuid = None
        self.access_token = None
        self.session_uuid = None

        # Set hawkeye access token
        self._set_token()

        # Set Hawkeye project UUID
        self._set_project_uuid()

        # Create Hawkeye session
        self._create_session()
    
    def _set_token(self):
        headers = {
            "Content-Type": "application/json",
            "Accept": "*/*"
        }
        payload = {
            "email": self.user,
            "password": self.password
        }
        url = f"{self.url}/api/v1/user/login"

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            access_token = response.json().get("access_token")

            if access_token:
                self.logger.info("Login successful, access token received.")
                self.access_token = access_token
            else:
                self.logger.warning("Login failed: No access token received.")

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Login failed: {e}")
    
    def _set_project_uuid(self):
        url = f"{self.url}/api/v1/project"
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        if self.access_token:
            try:
                response = requests.get(url, headers=headers)
                response.raise_for_status()
                specs = response.json().get("specs")

                if specs:
                    self.logger.info("Project UUIDs retrieved successfully.")
                    for project in specs:
                        if project.get("name") == self.name:
                            self.logger.info(f"{self.name} Project UUID: {project.get('uuid')}")
                            self.project_uuid = project.get("uuid")
                            
                if not self.project_uuid:
                    self.logger.warning(f"Unable to get UUID for {self.name} project")

            except requests.exceptions.RequestException as e:
                self.logger.error(f"List project and project UUID extraction faild: {e}")
    
    def _create_session(self):
        if self.project_uuid:
            url = f"{self.url}/api/v1/inference/new_session"
            request_id = str(uuid.uuid4())
            gendb_spec_uuid = str(uuid.uuid4())
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.access_token}"
            }
            payload = {
                "filter_chain": "null",
                "gendb_spec": {
                    "uuid": gendb_spec_uuid
                },
                "organization_uuid": "ORGANIZATION_NAME_ROOT",
                "project_uuid": f"{self.project_uuid}",
                "request": {
                    "request_id": request_id
                }
            }

            try:
                response = requests.post(url, headers=headers, json=payload)
                response.raise_for_status()
                senssion_uuid = response.json().get("session_uuid")

                if senssion_uuid:
                    self.logger.info(f"Session UUID retrieved successfully. session_uuid: {senssion_uuid}")
                    self.session_uuid = senssion_uuid
                else:
                    self.logger.warning(f"Unable to create session")

            except requests.exceptions.RequestException as e:
                self.logger.error(f"Create session faild: {e}")
    
    def send_prompt(self, prompt: str):
        if self.session_uuid:
            url = f"{self.url}/api/v1/inference/session"
            request_id = str(uuid.uuid4())
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.access_token}"
            }
            payload = {
                "action": "ACTION_NEXT",
                "session_uuid": self.session_uuid,
                "project_uuid": self.project_uuid,
                "messages": [
                    {
                        "content": {
                            "content_type": "CONTENT_TYPE_CHAT_PROMPT",
                            "parts": [prompt]
                        }
                    }
                ],
                "request": {
                    "request_id": request_id
                }
            }

            try:
                response = requests.post(url, headers=headers, json=payload, stream=True)
                response.raise_for_status()
                self.logger.info(f"Prompt sent successfully. prompt: {prompt}")
                response.close()

            except requests.exceptions.RequestException as e:
                self.logger.error(f"Send prompt failed: {e}")