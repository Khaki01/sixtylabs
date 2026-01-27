import os
import logging
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

# Email configuration from environment
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@sixtylens.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Dev mode - if true, log emails instead of sending
EMAIL_DEV_MODE = os.getenv("EMAIL_DEV_MODE", "true").lower() == "true"

# Template setup
TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


def get_ses_client():
    """Get AWS SES client with credentials from environment."""
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            "ses",
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        )
    # Fall back to default credentials (IAM role, etc.)
    return boto3.client("ses", region_name=AWS_REGION)


def render_template(template_name: str, **context) -> str:
    """Render a Jinja2 template with the given context."""
    template = jinja_env.get_template(template_name)
    return template.render(**context)


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """
    Send an email using AWS SES.

    Returns True if email was sent successfully, False otherwise.
    """
    # Dev mode: log email instead of sending
    if EMAIL_DEV_MODE:
        logger.info(f"[DEV MODE] Email would be sent to: {to_email}")
        logger.info(f"[DEV MODE] Subject: {subject}")
        logger.info(f"[DEV MODE] Body:\n{text_body}")
        return True

    try:
        client = get_ses_client()
        response = client.send_email(
            Source=EMAIL_FROM,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                    "Text": {"Data": text_body, "Charset": "UTF-8"},
                },
            },
        )
        logger.info(f"Email sent to {to_email}, MessageId: {response['MessageId']}")
        return True
    except ClientError as e:
        logger.error(f"Failed to send email to {to_email}: {e.response['Error']['Message']}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def send_confirmation_email(to_email: str, username: str, token: str) -> bool:
    """
    Send email confirmation email to user.

    Args:
        to_email: User's email address
        username: User's username
        token: Confirmation token

    Returns:
        True if email was sent successfully, False otherwise.
    """
    confirmation_url = f"{FRONTEND_URL}/confirm-email?token={token}"

    context = {
        "username": username,
        "confirmation_url": confirmation_url,
        "frontend_url": FRONTEND_URL,
    }

    try:
        html_body = render_template("confirmation.html", **context)
        text_body = render_template("confirmation.txt", **context)
    except Exception as e:
        logger.error(f"Failed to render email template: {str(e)}")
        return False

    return send_email(
        to_email=to_email,
        subject="Confirm your email - Sixty Lens",
        html_body=html_body,
        text_body=text_body,
    )
