-- Migration: 002_seed_iso27001_controls.sql
-- Description: Seed ISO 27001:2022 controls
-- Author: Adverant Compliance Engine
-- Date: 2025-12-31

-- ============================================================================
-- ISO 27001:2022 CONTROLS
-- Based on Annex A of ISO/IEC 27001:2022
-- ============================================================================

-- A.5 Organizational controls
INSERT INTO compliance_controls (id, framework_id, control_number, domain, subdomain, title, description, objective, implementation_guidance, risk_category, implementation_priority, automated_test_available, ai_assessment_prompt)
VALUES
-- A.5.1 - A.5.8 Policies and organization
('ISO27001-A.5.1', 'iso27001', 'A.5.1', 'Organizational', 'Policies', 'Policies for information security',
 'A set of policies for information security shall be defined, approved by management, published, communicated, and reviewed at planned intervals.',
 'To ensure the appropriate direction and support for information security in accordance with business requirements and relevant laws and regulations.',
 'Develop and maintain an information security policy that addresses business objectives, security requirements, and regulatory compliance. Ensure executive approval and regular review cycles.',
 'high', 90, false,
 'Evaluate the organization''s information security policy framework. Check for: executive approval, communication to stakeholders, review frequency, alignment with business objectives, and regulatory compliance.'),

('ISO27001-A.5.2', 'iso27001', 'A.5.2', 'Organizational', 'Roles', 'Information security roles and responsibilities',
 'Information security roles and responsibilities shall be defined and allocated according to the organization needs.',
 'To establish a defined and approved information security structure and accountabilities.',
 'Define roles such as CISO, security managers, and asset owners. Document responsibilities in job descriptions and organizational charts.',
 'high', 88, false,
 'Review organizational structure for security roles. Verify: CISO appointment, security committee existence, documented responsibilities, and clear reporting lines.'),

('ISO27001-A.5.3', 'iso27001', 'A.5.3', 'Organizational', 'Roles', 'Segregation of duties',
 'Conflicting duties and conflicting areas of responsibility shall be segregated.',
 'To reduce the risk of fraud, error, and unauthorized access to information.',
 'Identify conflicting duties in critical processes. Implement controls where segregation is not possible.',
 'high', 85, true,
 'Analyze duty segregation in critical processes. Look for: conflicting access rights, approval workflows, and compensating controls where segregation isn''t possible.'),

('ISO27001-A.5.4', 'iso27001', 'A.5.4', 'Organizational', 'Management', 'Management responsibilities',
 'Management shall require all personnel to apply information security in accordance with the established policies and procedures.',
 'To ensure that management leads by example in supporting information security.',
 'Include security requirements in management communications. Hold managers accountable for team compliance.',
 'high', 87, false,
 'Evaluate management commitment to security. Check: management communications, security metrics reviews, resource allocation, and disciplinary procedures.'),

('ISO27001-A.5.5', 'iso27001', 'A.5.5', 'Organizational', 'External', 'Contact with authorities',
 'Appropriate contacts with relevant authorities shall be established and maintained.',
 'To ensure appropriate flow of information with authorities for regulatory and incident response purposes.',
 'Maintain contact list for law enforcement, regulators, and incident response teams.',
 'medium', 60, false,
 'Verify authority contact procedures. Check: contact list currency, communication protocols, and incident reporting procedures.'),

('ISO27001-A.5.6', 'iso27001', 'A.5.6', 'Organizational', 'External', 'Contact with special interest groups',
 'Appropriate contacts with special interest groups or other specialist security forums shall be established and maintained.',
 'To ensure appropriate flow of information related to information security.',
 'Participate in ISACs, security forums, and vendor security programs.',
 'low', 40, false,
 'Review participation in security communities. Check: membership in ISACs, attendance at security conferences, and threat intelligence sharing.'),

('ISO27001-A.5.7', 'iso27001', 'A.5.7', 'Organizational', 'Threat Intelligence', 'Threat intelligence',
 'Information relating to information security threats shall be collected and analyzed to produce threat intelligence.',
 'To provide awareness of the organization''s threat environment.',
 'Implement threat intelligence feeds, analysis capabilities, and integration with security operations.',
 'high', 82, true,
 'Assess threat intelligence program. Evaluate: intelligence sources, analysis capabilities, dissemination processes, and operational integration.'),

('ISO27001-A.5.8', 'iso27001', 'A.5.8', 'Organizational', 'Project Management', 'Information security in project management',
 'Information security shall be integrated into project management.',
 'To ensure information security risks are addressed throughout project lifecycle.',
 'Include security requirements gathering, risk assessments, and security reviews in project methodology.',
 'medium', 70, false,
 'Review project management methodology for security integration. Check: security gates, risk assessments, and security testing requirements.'),

-- A.5.9 - A.5.14 Asset management
('ISO27001-A.5.9', 'iso27001', 'A.5.9', 'Organizational', 'Asset Management', 'Inventory of information and other associated assets',
 'An inventory of information and other associated assets, including owners, shall be developed and maintained.',
 'To identify and track organizational assets for protection.',
 'Implement asset management system covering hardware, software, data, and services. Assign owners.',
 'high', 88, true,
 'Evaluate asset inventory completeness. Check: asset discovery, ownership assignment, classification, and inventory accuracy.'),

('ISO27001-A.5.10', 'iso27001', 'A.5.10', 'Organizational', 'Asset Management', 'Acceptable use of information and other associated assets',
 'Rules for the acceptable use and procedures for handling information and other associated assets shall be identified, documented, and implemented.',
 'To ensure appropriate use and handling of organizational assets.',
 'Develop acceptable use policies covering data handling, internet use, and asset management.',
 'high', 85, false,
 'Review acceptable use policies. Verify: policy coverage, acknowledgment tracking, and enforcement mechanisms.'),

('ISO27001-A.5.11', 'iso27001', 'A.5.11', 'Organizational', 'Asset Management', 'Return of assets',
 'Personnel and other interested parties as appropriate shall return all the organization''s assets in their possession upon change or termination of their employment, contract or agreement.',
 'To protect organization''s assets from unauthorized retention.',
 'Implement asset return procedures as part of offboarding. Track and verify asset returns.',
 'medium', 72, true,
 'Assess asset return procedures. Check: offboarding checklists, return verification, and access revocation timing.'),

('ISO27001-A.5.12', 'iso27001', 'A.5.12', 'Organizational', 'Information Classification', 'Classification of information',
 'Information shall be classified according to the information security needs of the organization based on confidentiality, integrity, availability, and relevant interested party requirements.',
 'To ensure consistent and appropriate protection of information.',
 'Implement classification scheme (e.g., Public, Internal, Confidential, Restricted) with handling requirements.',
 'high', 86, true,
 'Evaluate information classification scheme. Check: classification levels, handling requirements, labeling, and user awareness.'),

('ISO27001-A.5.13', 'iso27001', 'A.5.13', 'Organizational', 'Information Classification', 'Labelling of information',
 'An appropriate set of procedures for information labelling shall be developed and implemented in accordance with the information classification scheme adopted by the organization.',
 'To facilitate the identification of information protection requirements.',
 'Implement labeling standards for documents, emails, and data. Automate where possible.',
 'medium', 70, true,
 'Review labeling procedures. Check: labeling standards, automation tools, and compliance verification.'),

('ISO27001-A.5.14', 'iso27001', 'A.5.14', 'Organizational', 'Information Transfer', 'Information transfer',
 'Information transfer rules, procedures, or agreements shall be in place for all types of transfer facilities within the organization and between the organization and other parties.',
 'To maintain the security of information during transfer.',
 'Define and implement secure transfer procedures for email, file sharing, and physical media.',
 'high', 84, true,
 'Assess information transfer security. Check: encryption in transit, approved transfer methods, and third-party agreements.');

-- A.5.15 - A.5.23 Access control
INSERT INTO compliance_controls (id, framework_id, control_number, domain, subdomain, title, description, objective, implementation_guidance, risk_category, implementation_priority, automated_test_available, ai_assessment_prompt)
VALUES
('ISO27001-A.5.15', 'iso27001', 'A.5.15', 'Organizational', 'Access Control', 'Access control',
 'Rules to control physical and logical access to information and other associated assets shall be established and implemented based on business and information security requirements.',
 'To ensure authorized access and prevent unauthorized access to information.',
 'Implement access control policy based on need-to-know and least privilege principles.',
 'critical', 95, true,
 'Evaluate access control framework. Check: policy documentation, implementation of least privilege, and regular access reviews.'),

('ISO27001-A.5.16', 'iso27001', 'A.5.16', 'Organizational', 'Identity Management', 'Identity management',
 'The full lifecycle of identities shall be managed.',
 'To ensure appropriate identity creation, modification, and termination.',
 'Implement identity lifecycle management including provisioning, modification, and deprovisioning.',
 'critical', 94, true,
 'Review identity lifecycle management. Check: provisioning workflows, joiner-mover-leaver processes, and orphan account detection.'),

('ISO27001-A.5.17', 'iso27001', 'A.5.17', 'Organizational', 'Authentication', 'Authentication information',
 'Allocation and management of authentication information shall be controlled by a management process.',
 'To ensure proper handling of authentication credentials.',
 'Implement secure credential management including strong passwords, MFA, and credential rotation.',
 'critical', 93, true,
 'Assess authentication controls. Check: password policies, MFA implementation, credential storage, and rotation practices.'),

('ISO27001-A.5.18', 'iso27001', 'A.5.18', 'Organizational', 'Access Rights', 'Access rights',
 'Access rights to information and other associated assets shall be provisioned, reviewed, modified and removed in accordance with the organization''s topic-specific policy on and rules for access control.',
 'To ensure authorized access and prevent unauthorized access.',
 'Implement access provisioning workflows, periodic reviews, and timely revocation.',
 'critical', 92, true,
 'Evaluate access rights management. Check: provisioning automation, review frequency, and revocation timeliness.');

-- A.5.19 - A.5.23 Supplier relationships
INSERT INTO compliance_controls (id, framework_id, control_number, domain, subdomain, title, description, objective, implementation_guidance, risk_category, implementation_priority, automated_test_available, ai_assessment_prompt)
VALUES
('ISO27001-A.5.19', 'iso27001', 'A.5.19', 'Organizational', 'Supplier Relationships', 'Information security in supplier relationships',
 'Processes and procedures shall be defined and implemented to manage the information security risks associated with the use of supplier''s products or services.',
 'To maintain agreed level of information security in supplier relationships.',
 'Implement supplier security assessment program including due diligence and ongoing monitoring.',
 'high', 85, false,
 'Review supplier security management. Check: risk assessment process, security requirements, and ongoing monitoring.'),

('ISO27001-A.5.20', 'iso27001', 'A.5.20', 'Organizational', 'Supplier Relationships', 'Addressing information security within supplier agreements',
 'Relevant information security requirements shall be established and agreed with each supplier based on the type of supplier relationship.',
 'To ensure suppliers meet organization''s security requirements.',
 'Include security requirements, incident reporting, and audit rights in supplier contracts.',
 'high', 84, false,
 'Assess supplier agreements. Check: security clauses, incident notification requirements, and right-to-audit provisions.'),

('ISO27001-A.5.21', 'iso27001', 'A.5.21', 'Organizational', 'Supplier Relationships', 'Managing information security in the ICT supply chain',
 'Processes and procedures shall be defined and implemented to manage the information security risks associated with the ICT products and services supply chain.',
 'To maintain agreed level of security for ICT supply chain.',
 'Assess supply chain risks, require security assurance from suppliers, and monitor for vulnerabilities.',
 'high', 83, false,
 'Evaluate ICT supply chain security. Check: vendor security assessments, software bill of materials, and vulnerability monitoring.'),

('ISO27001-A.5.22', 'iso27001', 'A.5.22', 'Organizational', 'Supplier Relationships', 'Monitoring, review and change management of supplier services',
 'The organization shall regularly monitor, review, audit and evaluate changes in supplier information security practices and service delivery.',
 'To maintain agreed level of information security and service delivery.',
 'Implement ongoing supplier monitoring, periodic reviews, and change management procedures.',
 'high', 80, false,
 'Review supplier monitoring program. Check: performance metrics, security audits, and change notification procedures.'),

('ISO27001-A.5.23', 'iso27001', 'A.5.23', 'Organizational', 'Cloud Services', 'Information security for use of cloud services',
 'Processes for acquisition, use, management and exit from cloud services shall be established in accordance with the organization''s information security requirements.',
 'To ensure information security in cloud service usage.',
 'Define cloud security requirements, assess providers, and implement exit strategies.',
 'high', 86, true,
 'Assess cloud security management. Check: provider assessment, shared responsibility model, and data residency requirements.');

-- A.5.24 - A.5.30 Incident management
INSERT INTO compliance_controls (id, framework_id, control_number, domain, subdomain, title, description, objective, implementation_guidance, risk_category, implementation_priority, automated_test_available, ai_assessment_prompt)
VALUES
('ISO27001-A.5.24', 'iso27001', 'A.5.24', 'Organizational', 'Incident Management', 'Information security incident management planning and preparation',
 'The organization shall plan and prepare for managing information security incidents by defining, establishing, and communicating information security incident management processes, roles, and responsibilities.',
 'To ensure consistent and effective approach to incident management.',
 'Develop incident response plan, establish CSIRT, and conduct regular exercises.',
 'critical', 92, false,
 'Evaluate incident management planning. Check: response plans, team structure, roles and responsibilities, and exercise frequency.'),

('ISO27001-A.5.25', 'iso27001', 'A.5.25', 'Organizational', 'Incident Management', 'Assessment and decision on information security events',
 'The organization shall assess information security events and decide if they are to be categorized as information security incidents.',
 'To ensure proper classification and handling of security events.',
 'Define event classification criteria and escalation procedures.',
 'high', 88, true,
 'Review event assessment process. Check: classification criteria, escalation thresholds, and triage procedures.'),

('ISO27001-A.5.26', 'iso27001', 'A.5.26', 'Organizational', 'Incident Management', 'Response to information security incidents',
 'Information security incidents shall be responded to in accordance with the documented procedures.',
 'To ensure appropriate and timely incident response.',
 'Implement incident response procedures covering containment, eradication, and recovery.',
 'critical', 91, true,
 'Assess incident response capabilities. Check: response procedures, containment strategies, and communication plans.'),

('ISO27001-A.5.27', 'iso27001', 'A.5.27', 'Organizational', 'Incident Management', 'Learning from information security incidents',
 'Knowledge gained from information security incidents shall be used to strengthen and improve the information security controls.',
 'To reduce likelihood and impact of future incidents.',
 'Conduct post-incident reviews and implement lessons learned.',
 'high', 82, false,
 'Review lessons learned process. Check: post-incident analysis, improvement tracking, and knowledge sharing.'),

('ISO27001-A.5.28', 'iso27001', 'A.5.28', 'Organizational', 'Incident Management', 'Collection of evidence',
 'The organization shall establish and implement procedures for the identification, collection, acquisition, and preservation of evidence related to information security events.',
 'To support potential legal or disciplinary actions.',
 'Implement forensic readiness and evidence handling procedures.',
 'high', 80, false,
 'Assess evidence collection capabilities. Check: forensic procedures, chain of custody, and preservation methods.');

-- A.5.29 - A.5.37 Business continuity
INSERT INTO compliance_controls (id, framework_id, control_number, domain, subdomain, title, description, objective, implementation_guidance, risk_category, implementation_priority, automated_test_available, ai_assessment_prompt)
VALUES
('ISO27001-A.5.29', 'iso27001', 'A.5.29', 'Organizational', 'Business Continuity', 'Information security during disruption',
 'The organization shall plan how to maintain information security at an appropriate level during disruption.',
 'To ensure information security during business disruption.',
 'Include security requirements in business continuity plans.',
 'high', 85, false,
 'Review security in continuity planning. Check: security requirements in BCP, DR security controls, and crisis communication security.'),

('ISO27001-A.5.30', 'iso27001', 'A.5.30', 'Organizational', 'Business Continuity', 'ICT readiness for business continuity',
 'ICT readiness shall be planned, implemented, maintained, and tested based on business continuity objectives and ICT continuity requirements.',
 'To ensure availability of ICT during disruption.',
 'Implement ICT continuity plan with recovery objectives and regular testing.',
 'high', 87, true,
 'Assess ICT continuity readiness. Check: RTO/RPO definitions, backup procedures, recovery testing, and failover capabilities.'),

('ISO27001-A.5.31', 'iso27001', 'A.5.31', 'Organizational', 'Compliance', 'Legal, statutory, regulatory and contractual requirements',
 'Legal, statutory, regulatory, and contractual requirements relevant to information security and the organization''s approach to meet these requirements shall be identified, documented, and kept up to date.',
 'To ensure compliance with legal and regulatory requirements.',
 'Maintain register of applicable requirements and implement compliance monitoring.',
 'high', 88, false,
 'Review compliance requirements register. Check: completeness, currency, and compliance monitoring mechanisms.'),

('ISO27001-A.5.32', 'iso27001', 'A.5.32', 'Organizational', 'Compliance', 'Intellectual property rights',
 'The organization shall implement appropriate procedures to protect intellectual property rights.',
 'To ensure compliance with intellectual property requirements.',
 'Implement software licensing management and IP protection procedures.',
 'medium', 70, true,
 'Assess IP protection. Check: software licensing compliance, IP inventory, and protection mechanisms.'),

('ISO27001-A.5.33', 'iso27001', 'A.5.33', 'Organizational', 'Compliance', 'Protection of records',
 'Records shall be protected from loss, destruction, falsification, unauthorized access, and unauthorized release in accordance with legal, statutory, regulatory, and contractual requirements.',
 'To ensure integrity and availability of required records.',
 'Implement records management including classification, retention, and disposal.',
 'high', 82, true,
 'Review records protection. Check: retention policies, access controls, and disposal procedures.'),

('ISO27001-A.5.34', 'iso27001', 'A.5.34', 'Organizational', 'Privacy', 'Privacy and protection of PII',
 'The organization shall identify and meet the requirements regarding the preservation of privacy and protection of PII according to applicable laws and regulations and contractual requirements.',
 'To ensure privacy and data protection compliance.',
 'Implement privacy program including data inventory, legal basis, and rights management.',
 'critical', 94, true,
 'Assess privacy and PII protection. Check: data inventory, legal basis documentation, privacy notices, and rights fulfillment.'),

('ISO27001-A.5.35', 'iso27001', 'A.5.35', 'Organizational', 'Compliance', 'Independent review of information security',
 'The organization''s approach to managing information security and its implementation shall be reviewed independently at planned intervals or when significant changes occur.',
 'To ensure ongoing suitability and effectiveness of information security.',
 'Conduct periodic independent security audits and reviews.',
 'high', 80, false,
 'Review independent assessment program. Check: audit frequency, scope coverage, and finding remediation.'),

('ISO27001-A.5.36', 'iso27001', 'A.5.36', 'Organizational', 'Compliance', 'Compliance with policies, rules and standards for information security',
 'Compliance with the organization''s information security policy, topic-specific policies, rules, and standards shall be regularly reviewed.',
 'To ensure operational compliance with security requirements.',
 'Implement compliance monitoring and regular reviews.',
 'high', 83, true,
 'Assess compliance monitoring. Check: review frequency, compliance metrics, and exception management.'),

('ISO27001-A.5.37', 'iso27001', 'A.5.37', 'Organizational', 'Compliance', 'Documented operating procedures',
 'Operating procedures for information processing facilities shall be documented and made available to personnel who need them.',
 'To ensure correct and secure operations.',
 'Document operational procedures and ensure accessibility.',
 'medium', 75, false,
 'Review operational documentation. Check: procedure availability, currency, and accessibility.');

-- Update framework with control count
UPDATE compliance_frameworks
SET total_controls = (SELECT COUNT(*) FROM compliance_controls WHERE framework_id = 'iso27001'),
    critical_controls = (SELECT COUNT(*) FROM compliance_controls WHERE framework_id = 'iso27001' AND risk_category = 'critical'),
    updated_at = NOW()
WHERE id = 'iso27001';

COMMENT ON TABLE compliance_controls IS 'Compliance controls including ISO 27001:2022 Annex A controls';
