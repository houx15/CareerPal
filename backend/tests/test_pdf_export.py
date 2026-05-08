from datetime import date
from io import BytesIO

import fitz

from tests.test_page_generation import auth_headers, update_profile


def pdf_text(content: bytes) -> str:
    document = fitz.open(stream=BytesIO(content), filetype="pdf")
    try:
        return "\n".join(page.get_text() for page in document)
    finally:
        document.close()


def normalized_pdf_text(content: bytes) -> str:
    return " ".join(pdf_text(content).split())


def test_pdf_export_requires_authentication(client):
    response = client.get("/api/page/export/pdf")

    assert response.status_code == 401


def test_pdf_export_downloads_structured_profile_content(client):
    headers = auth_headers(client)
    update_profile(
        client,
        headers,
        name="Maya Chen",
        phone="+1 555 123 4567",
        contact_email="maya@example.com",
        location="Seattle, WA",
        headline="Computer science student building reliable tools",
        target_direction="Backend software engineering",
        comment="Interested in developer productivity.",
        education=[
            {
                "school": "University of Washington",
                "degree": "B.S. Computer Science",
                "time": "2023 - 2027",
                "comment": "Systems track",
            }
        ],
        experience=[
            {
                "company": "Stripe",
                "role": "Backend Engineering Intern",
                "time": "Summer 2025",
                "description": "Built reconciliation jobs for payment reporting.",
                "achievements": ["Reduced manual review time by 30%"],
            }
        ],
        projects=[
            {
                "name": "Career Graph",
                "description": "Mapped projects to skills for internship applications.",
                "tech_stack": ["Python", "React"],
                "achievements": ["Reduced resume tailoring time by 40%"],
                "link": "https://example.com/career-graph",
                "completeness": "complete",
            }
        ],
        skills=[
            {"name": "Python", "category": "Backend", "proficiency": "advanced"},
            {"name": "React", "category": "Frontend", "proficiency": "intermediate"},
        ],
        certificates=[
            {
                "name": "AWS Certified Cloud Practitioner",
                "issuer": "Amazon Web Services",
                "date": date(2025, 4, 15).isoformat(),
            }
        ],
    )

    response = client.get("/api/page/export/pdf", headers=headers)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith('attachment; filename="careerpal_resume_maya-chen')
    assert response.content.startswith(b"%PDF")
    text = normalized_pdf_text(response.content)
    assert "Maya Chen" in text
    assert "Computer science student building reliable tools" in text
    assert "Interested in developer productivity." in text
    assert "Stripe" in text
    assert "Reduced manual review time by 30%" in text
    assert "Career Graph" in text
    assert "Python" in text
    assert "University of Washington" in text
    assert "AWS Certified Cloud Practitioner" in text


def test_pdf_export_omits_empty_sections(client):
    headers = auth_headers(client)
    update_profile(
        client,
        headers,
        name="Maya Chen",
        contact_email="maya@example.com",
        headline="Computer science student",
        comment="I build reliable tools.",
        education=[],
        experience=[],
        projects=[],
        skills=[],
        certificates=[],
    )

    response = client.get("/api/page/export/pdf", headers=headers)

    assert response.status_code == 200
    text = normalized_pdf_text(response.content)
    assert "Maya Chen" in text
    assert "Experience" not in text
    assert "Projects" not in text
    assert "Education" not in text
    assert "Certifications" not in text


def test_pdf_export_preserves_non_ascii_profile_text(client):
    headers = auth_headers(client)
    update_profile(
        client,
        headers,
        name="李明",
        contact_email="liming@example.com",
        headline="后端工程师",
        comment="构建可靠的校园工具。",
        education=[],
        experience=[],
        projects=[],
        skills=[],
        certificates=[],
    )

    response = client.get("/api/page/export/pdf", headers=headers)

    assert response.status_code == 200
    text = pdf_text(response.content)
    assert "李明" in text
    assert "后端工程师" in text
    assert "构建可靠的校园工具" in text


def test_pdf_export_keeps_long_unbroken_links_extractable(client):
    headers = auth_headers(client)
    long_link = "https://example.com/" + ("careerpal-profile-export-" * 8)
    update_profile(
        client,
        headers,
        name="Maya Chen",
        contact_email="very-long-contact-address-for-export-testing@example.com",
        headline="Computer science student",
        comment="I build reliable tools.",
        education=[],
        experience=[],
        projects=[
            {
                "name": "Career Graph",
                "description": "Mapped projects to skills.",
                "tech_stack": ["Python"],
                "achievements": [],
                "link": long_link,
                "completeness": "partial",
            }
        ],
        skills=[],
        certificates=[],
    )

    response = client.get("/api/page/export/pdf", headers=headers)

    assert response.status_code == 200
    text = pdf_text(response.content).replace("\n", "")
    assert long_link in text


def test_pdf_export_uses_only_current_users_profile(client):
    owner_headers = auth_headers(client, email="owner.export@example.com", username="ownerexport")
    other_headers = auth_headers(client, email="other.export@example.com", username="otherexport")
    update_profile(
        client,
        owner_headers,
        name="Owner Student",
        contact_email="owner@example.com",
        headline="Backend student",
        comment="Owner-only profile.",
        education=[],
        experience=[],
        projects=[],
        skills=[],
        certificates=[],
    )
    update_profile(
        client,
        other_headers,
        name="Other Student",
        contact_email="other@example.com",
        headline="Frontend student",
        comment="Other-only profile.",
        education=[],
        experience=[],
        projects=[],
        skills=[],
        certificates=[],
    )

    response = client.get("/api/page/export/pdf", headers=owner_headers)

    assert response.status_code == 200
    text = normalized_pdf_text(response.content)
    assert "Owner Student" in text
    assert "Owner-only profile." in text
    assert "Other Student" not in text
    assert "Other-only profile." not in text
