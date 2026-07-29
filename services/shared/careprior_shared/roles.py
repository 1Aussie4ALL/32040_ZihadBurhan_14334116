from enum import Enum


class Role(str, Enum):
    PATIENT = "patient"
    RECEPTION = "reception"
    NURSE = "nurse"
    MANAGER = "manager"
    ADMIN = "admin"
    RESEARCHER = "researcher"


STAFF_ROLES = {Role.RECEPTION, Role.NURSE, Role.MANAGER, Role.ADMIN}
CLINICAL_REVIEW_ROLES = {Role.NURSE}
