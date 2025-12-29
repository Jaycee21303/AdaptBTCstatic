"""
Curated course, lesson, and quiz content for the AdaptBTC learning portal.
This module centralizes detailed text so seeding logic can stay focused on
persistence and querying concerns.
"""

from __future__ import annotations

from typing import Dict, List

CourseContent = Dict[str, object]
LessonContent = Dict[str, object]
Question = Dict[str, object]

# Detailed courses for Bitcoin fundamentals and security.
COURSE_LIBRARY: Dict[str, CourseContent] = {
    "bitcoin-101": {
        "title": "Bitcoin 101 Fundamentals",
        "summary": (
            "A practitioner-friendly introduction to Bitcoin that explains how the network works, "
            "why decentralization matters, and how to verify your own transactions without relying on custodians."
        ),
    },
    "security-essentials": {
        "title": "Bitcoin Security Essentials",
        "summary": (
            "Operational security for individuals and teams who want to protect keys, minimize single points of failure, "
            "and respond well to incidents without losing funds or critical data."
        ),
    },
    "operations-lab": {
        "title": "Operations Lab: Tools & Automation",
        "summary": (
            "Hands-on playbooks that connect AdaptBTC tools with production-ready workflows, "
            "including wallet automation, reporting dashboards, and uptime checks."
        ),
    },
}


BITCOIN_101_LESSONS: List[LessonContent] = [
    {
        "title": "What Bitcoin Solves",
        "paragraphs": [
            "Bitcoin solves the problem of coordinating a shared ledger without a central authority by combining economic incentives with cryptography.",
            "Proof-of-work establishes an objective history of blocks so that nodes can agree on the longest valid chain even in adversarial conditions.",
            "Nodes independently verify signatures, transaction formats, and consensus rules, eliminating the need for trust in miners or third parties.",
            "The system’s 21 million supply cap is enforced by software rules that anyone can audit by running a full node at home or in the cloud.",
            "Open-source governance keeps the protocol slow to change, favoring backward compatibility and predictable security over rapid iteration.",
        ],
        "examples": [
            "An individual can download Bitcoin Core, sync the blockchain, and verify that their incoming transaction is confirmed without asking a bank.",
            "Businesses can programmatically watch mempool activity to detect fee spikes and adjust invoicing or batching strategies in real time.",
        ],
        "glossary": {
            "Decentralization": "The property of removing single points of control so consensus emerges from many peers.",
            "Ledger": "A record of balances and transactions that must be agreed upon by network participants.",
            "Proof-of-Work": "A consensus mechanism where energy expenditure provides Sybil resistance and ordering of blocks.",
        },
        "takeaways": [
            "Bitcoin aligns incentives to maintain a consistent ledger without centralized control.",
            "Running your own node is the foundation of self-verification and financial sovereignty.",
            "Security emerges from transparency, auditability, and the cost of rewriting history.",
        ],
    },
    {
        "title": "Keys, Addresses, and Wallets",
        "paragraphs": [
            "Private keys generate public keys through elliptic curve multiplication on secp256k1; addresses encode public key hashes for usability.",
            "Hierarchical Deterministic (HD) wallets follow BIP32/BIP44 standards to derive many addresses from a single seed, supporting backups and account separation.",
            "Using new addresses per payment preserves privacy by avoiding linkability between transactions and balances.",
            "Wallet software should default to bech32m or bech32 addresses for lower fees and better error detection compared to legacy formats.",
            "Hardware wallets isolate private keys from networked devices, reducing exposure to malware and phishing attempts.",
        ],
        "examples": [
            "A treasurer uses an air-gapped signing device to approve outbound UTXO spends while a watch-only wallet tracks balances.",
            "A developer uses BIP39 mnemonic seeds with an optional passphrase to segregate test funds from production holdings.",
        ],
        "glossary": {
            "BIP32": "Standard for hierarchical deterministic key derivation that enables structured paths for wallets.",
            "Address Reuse": "Using the same address multiple times, harming privacy and revealing balances.",
            "Bech32": "Human-readable SegWit address format improving checksums and lowering transaction size.",
        },
        "takeaways": [
            "Seed phrases must be protected physically and logically; keys should never touch untrusted networks.",
            "HD paths allow organizations to separate roles and accounts without juggling many unrelated seeds.",
            "Prefer modern address types to optimize fees and error detection.",
        ],
    },
    {
        "title": "UTXOs and Transactions",
        "paragraphs": [
            "Bitcoin uses Unspent Transaction Outputs (UTXOs) instead of account balances, enabling precise spending and privacy via coin selection.",
            "Each input references a previous UTXO and proves ownership with a unlocking script; each output defines spending conditions via locking scripts.",
            "Fee calculation depends on virtual size rather than value transferred; batching outputs reduces overhead for businesses with many payouts.",
            "Replace-By-Fee (RBF) allows increasing fees on unconfirmed transactions, while Child-Pays-for-Parent (CPFP) lets recipients accelerate confirmation.",
            "Mempool policies differ across nodes; understanding them helps avoid stuck transactions when the network is congested.",
        ],
        "examples": [
            "An exchange consolidates small deposits into larger UTXOs during low-fee windows to reduce future spend costs.",
            "A merchant uses RBF for point-of-sale refunds, enabling quick fee bumps if the original transaction is slow.",
        ],
        "glossary": {
            "UTXO": "Unspent Transaction Output, representing discrete chunks of value that can be spent once.",
            "ScriptPubKey": "Locking script that sets the conditions required to spend an output.",
            "Transaction Weight": "Metric combining witness and non-witness data to determine fees in virtual bytes.",
        },
        "takeaways": [
            "Efficient coin selection improves privacy, reduces change outputs, and keeps fees low.",
            "Understanding mempool policy helps teams plan batching, CPFP strategies, and fee estimation.",
            "Scripts define spending rules; testing them protects against loss from typos or incorrect assumptions.",
        ],
    },
    {
        "title": "Mining and Consensus",
        "paragraphs": [
            "Miners assemble transactions into blocks and compete to find a nonce that satisfies the current difficulty target.",
            "Difficulty adjusts every 2016 blocks to target a ten-minute block interval regardless of hash rate changes.",
            "Full nodes enforce consensus rules independently of miners, rejecting invalid blocks even if they contain valid proof-of-work.",
            "Mining incentives align security with economic costs; attempting to reorganize the chain requires enormous energy expenditure.",
            "Pool centralization is mitigated by protocol upgrades like Stratum V2 and by running personal nodes to validate payouts.",
        ],
        "examples": [
            "A miner monitors hashrate swings after halvings to forecast revenue volatility and adjust operational budgets.",
            "Educators use block explorers to show how orphaned blocks occur during periods of competing proofs-of-work.",
        ],
        "glossary": {
            "Difficulty": "A network-wide parameter that controls how hard it is to find a valid block hash.",
            "Nonce": "A field miners vary to search for a block hash below the target.",
            "Halving": "Scheduled reduction of block subsidy every 210,000 blocks to control supply issuance.",
        },
        "takeaways": [
            "Hash rate and difficulty anchor Bitcoin’s security budget.",
            "Nodes decide validity; miners follow rules if they want their blocks accepted.",
            "Operational miners must plan for halvings, energy costs, and pool fee dynamics.",
        ],
    },
    {
        "title": "Running a Node",
        "paragraphs": [
            "Running a full node allows users to verify every block and transaction without trusting third parties.",
            "Nodes maintain mempool policies, enforce consensus rules, and broadcast transactions from connected peers.",
            "Resource planning includes disk space for the blockchain, bandwidth for peer connections, and memory for mempool handling.",
            "Privacy-conscious users can connect wallets via Tor or I2P to avoid leaking IP metadata while broadcasting transactions.",
            "Node operators should regularly back up configuration, monitor logs, and validate checkpoints after upgrades.",
        ],
        "examples": [
            "A small business deploys a pruned node in the cloud with restricted RPC credentials to serve internal wallet infrastructure.",
            "A hobbyist runs a Raspberry Pi node over Tor, pairing it with mobile wallets to self-verify payments.",
        ],
        "glossary": {
            "Pruning": "Node mode that discards old block data after validation to save disk space.",
            "Mempool": "Set of unconfirmed transactions a node knows about and may relay to peers.",
            "Peer Discovery": "Process where nodes find other peers via DNS seeds or addnode configurations.",
        },
        "takeaways": [
            "Operating your own node is the anchor of trustless Bitcoin use.",
            "Careful network configuration improves privacy and resilience against Sybil attacks.",
            "Monitoring and logging catch issues early, especially during upgrades.",
        ],
    },
    {
        "title": "Privacy and Address Management",
        "paragraphs": [
            "Address reuse links transactions, exposing spending patterns and balances to chain analysis.",
            "Techniques like coin control, CoinJoin, and PayJoin help break deterministic links between inputs and outputs.",
            "BIP47 payment codes and reusable payment URLs improve usability while avoiding address reuse in repeated billing scenarios.",
            "UTXO management policies should avoid merging unrelated funds, especially those with different risk profiles or counterparties.",
            "Operational privacy includes minimizing metadata leakage via network-level protections such as Tor and BIP324 encrypted transport.",
        ],
        "examples": [
            "A nonprofit separates donation UTXOs from operating expenses to prevent clustering and donor deanonymization.",
            "A merchant accepts PayJoin from point-of-sale terminals to reduce heuristic detection of change outputs.",
        ],
        "glossary": {
            "CoinJoin": "A collaborative transaction where participants combine inputs to reduce linkability.",
            "PayJoin": "Interactive transaction that involves both sender and receiver inputs to disguise typical spending patterns.",
            "Change Output": "Returned funds from a transaction that are sent back to the spender; often linkable if reused.",
        },
        "takeaways": [
            "Privacy is a process that spans address policies, coin selection, and network transport choices.",
            "Avoid merging funds from diverse sources without evaluating risk and compliance implications.",
            "Interactive transaction schemes can raise privacy without sacrificing user experience.",
        ],
    },
    {
        "title": "Fees and Mempool Dynamics",
        "paragraphs": [
            "Fees are driven by byte size and current mempool congestion; satoshis per vbyte is the relevant metric.",
            "Batching multiple outputs into a single transaction reduces per-payment overhead and smooths fee exposure.",
            "Fee estimation should consider target confirmation times, using conservative estimates during volatile demand spikes.",
            "CPFP and RBF are valuable tools when fee markets change quickly after broadcasting a transaction.",
            "Long-lived mempool backlogs can trigger eviction of low-fee transactions, affecting customer experience if not monitored.",
        ],
        "examples": [
            "An exchange sets dynamic withdrawal fees tied to mempool percentiles to avoid chronic underpayment during demand surges.",
            "A merchant enabling CPFP for incoming payments helps customers who paid low fees still receive timely confirmations.",
        ],
        "glossary": {
            "Sat/vB": "Fee rate metric representing satoshis per virtual byte of transaction data.",
            "Eviction": "Removal of low-fee transactions from a node’s mempool when capacity is exceeded.",
            "Batching": "Combining multiple outputs in one transaction to amortize fees across payments.",
        },
        "takeaways": [
            "Fee policies should adapt to market conditions while preserving user experience.",
            "Transparent communication about confirmation targets builds trust with customers.",
            "Monitoring mempool health prevents surprises during congestion events.",
        ],
    },
    {
        "title": "Lightning Network Foundations",
        "paragraphs": [
            "The Lightning Network uses payment channels to route off-chain transactions instantly with final settlement on-chain when channels close.",
            "Hash Time-Locked Contracts (HTLCs) ensure atomicity across multiple hops, preventing loss if an intermediary fails.",
            "Channel liquidity determines how much value can flow in each direction; balanced channels improve payment reliability.",
            "Routing nodes earn fees for forwarding payments and must manage connectivity, liquidity, and uptime.",
            "Upgrades like Taproot and PTLCs aim to improve privacy, efficiency, and routing flexibility for Lightning.",
        ],
        "examples": [
            "A merchant sets up a point-of-sale node with well-connected peers to receive instant Lightning payments for retail sales.",
            "A routing operator monitors gossip data and uses circular rebalancing to keep channels usable in both directions.",
        ],
        "glossary": {
            "Channel": "A two-party ledger allowing off-chain transfers until closure on the base layer.",
            "HTLC": "Conditional payment mechanism requiring a preimage reveal within a time lock.",
            "Rebalancing": "Moving liquidity through your own channels to restore capacity on the receiving side.",
        },
        "takeaways": [
            "Lightning improves speed and cost but requires active liquidity and uptime management.",
            "Understanding HTLC mechanics is vital to assessing routing reliability and risk.",
            "Channel policies affect user experience; monitor and adjust fees to attract healthy traffic.",
        ],
    },
    {
        "title": "Multisignature and Script",
        "paragraphs": [
            "Bitcoin Script allows complex spending conditions, from multisignature requirements to time locks and hash locks.",
            "Multisig distributes key control, reducing the risk of single-key compromise for businesses and families.",
            "Timelocks such as CheckSequenceVerify (CSV) and CheckLockTimeVerify (CLTV) enforce delays that support vaulting strategies.",
            "Descriptor wallets capture script structure explicitly, improving backup clarity and compatibility across software.",
            "Policy-based signing can layer organizational rules on top of script-level requirements to enforce governance.",
        ],
        "examples": [
            "A company uses a 2-of-3 multisig with geographically separated hardware wallets and a policy engine that requires two approvers.",
            "A parent sets up a vault with a 2-of-2 multisig plus a CSV timelock, adding friction against impulsive spending or theft.",
        ],
        "glossary": {
            "Multisig": "Requiring multiple signatures to authorize a spend, improving resilience against key loss or theft.",
            "Descriptor": "A human-readable string describing the script template and derivation paths for a wallet.",
            "Timelock": "A constraint that prevents spending until a certain block height or time.",
        },
        "takeaways": [
            "Script primitives enable strong governance for individuals and organizations.",
            "Descriptors simplify interoperability and reduce backup ambiguity.",
            "Timelocks add safety but require careful planning for recovery paths.",
        ],
    },
    {
        "title": "Operational Playbooks",
        "paragraphs": [
            "Bitcoin operations blend technical controls with human processes such as approvals, audits, and incident drills.",
            "Standard operating procedures should document wallet creation, access reviews, and spending thresholds.",
            "Practice disaster recovery by restoring from seeds and descriptors in a controlled environment to verify assumptions.",
            "Use hardware isolation for signing and separate monitoring credentials from signing keys to limit blast radius.",
            "Continuous improvement loops capture lessons from near misses, service degradation, and security updates.",
        ],
        "examples": [
            "A startup runs quarterly recovery drills using backed-up seeds and verifies that offline signers match expected fingerprints.",
            "An enterprise requires dual control for high-value spends and logs approvals in an immutable audit trail.",
        ],
        "glossary": {
            "Runbook": "Step-by-step guide for operational tasks such as wallet setup or incident response.",
            "Blast Radius": "The extent of damage possible if a control fails or an account is compromised.",
            "Dual Control": "Requirement that two independent people approve a sensitive action before execution.",
        },
        "takeaways": [
            "Documented processes reduce errors and make onboarding smoother.",
            "Recovery drills reveal hidden dependencies and gaps in backups.",
            "Separation of duties limits the impact of compromised credentials.",
        ],
    },
    {
        "title": "Economic Considerations",
        "paragraphs": [
            "Bitcoin’s fixed supply and issuance schedule create predictable scarcity that influences long-term valuation models.",
            "Fee markets are expected to replace block subsidies over time, incentivizing efficient transaction construction and batching.",
            "Market cycles often cluster around halvings but are also shaped by macro liquidity, adoption, and regulatory narratives.",
            "Mining profitability depends on energy costs, hardware efficiency, and pool fees, shaping global hash rate distribution.",
            "Lightning and sidechains may affect on-chain fee demand by shifting certain transaction types off the base layer.",
        ],
        "examples": [
            "An analyst tracks miner revenue per terahash to evaluate sustainability after difficulty adjustments and halvings.",
            "A treasury team models fee scenarios to decide when to batch payouts versus using Lightning for small transfers.",
        ],
        "glossary": {
            "Subsidy": "Newly minted bitcoin awarded to miners, declining every 210,000 blocks.",
            "Fee Market": "Dynamic pricing environment where transactions compete for block space.",
            "Hash Price": "Revenue per unit of hash rate, combining subsidy and fees.",
        },
        "takeaways": [
            "Economic forces influence security and user experience across the network.",
            "Treasury strategies should anticipate fee volatility and subsidy decline.",
            "Diversified payment rails (on-chain and Lightning) provide flexibility.",
        ],
    },
    {
        "title": "Lightning Operations",
        "paragraphs": [
            "Operating Lightning channels requires monitoring liquidity, counterparty reliability, and routing performance.",
            "Fee policies should balance attracting traffic with covering capital costs and on-chain channel management.",
            "Watchtowers or breach monitoring are essential to detect revoked states and punish dishonest peers.",
            "Channel backups such as Static Channel Backups (SCB) provide partial recovery but require coordination with peers.",
            "Routing node operators need observability around HTLC failures, gossip updates, and peer availability.",
        ],
        "examples": [
            "A services company uses autopilot tools to open channels with high-uptime nodes and periodically rebalances to maintain inbound capacity.",
            "A developer configures external watchtower services and monitors for force closes to prevent fund loss during downtime.",
        ],
        "glossary": {
            "Watchtower": "Service that monitors the blockchain for revoked channel states and broadcasts penalties if needed.",
            "SCB": "Static Channel Backup, a snapshot that helps recover channels with peer assistance after data loss.",
            "Force Close": "On-chain closure of a channel, often triggered by disputes or unresponsive peers.",
        },
        "takeaways": [
            "Lightning reliability depends on active monitoring and sound peer selection.",
            "Backups and watchtowers mitigate the risk of losing channel state data.",
            "Fee policies impact both revenue and user willingness to route through your node.",
        ],
    },
    {
        "title": "Security Culture",
        "paragraphs": [
            "Security is a habit shaped by training, communication, and reinforcement rather than one-time audits.",
            "Teams should practice least privilege, rotating credentials and limiting access to production systems and signing keys.",
            "Phishing and social engineering remain common attack vectors; using FIDO2 keys and hardware MFA reduces risk.",
            "Clear escalation paths ensure incidents are contained quickly with accurate communication to stakeholders.",
            "Post-incident reviews should focus on learning and systemic fixes rather than blame.",
        ],
        "examples": [
            "A company requires hardware security keys for all administrative accounts and blocks SMS-based MFA.",
            "An ops team conducts tabletop exercises simulating seed exposure to test notification and containment procedures.",
        ],
        "glossary": {
            "Least Privilege": "Principle of granting the minimum access required to perform a task.",
            "Social Engineering": "Manipulating people into revealing information or performing actions that compromise security.",
            "Tabletop Exercise": "Simulated scenario used to rehearse response plans and identify gaps.",
        },
        "takeaways": [
            "Consistent training and strong authentication raise the cost of common attacks.",
            "Defined escalation keeps everyone aligned during stressful incidents.",
            "Learning-focused reviews improve systems more than blame-focused ones.",
        ],
    },
    {
        "title": "Regulatory Awareness",
        "paragraphs": [
            "Bitcoin participants must understand local regulations regarding custody, reporting, and consumer protection.",
            "Travel Rule obligations may apply to custodial services, requiring secure data exchange and privacy-aware architecture.",
            "FATF guidance and local licensing regimes influence how businesses design onboarding, KYC, and transaction monitoring.",
            "Non-custodial tools generally have fewer regulatory obligations but should still prioritize user privacy and transparency.",
            "Documentation of controls and audits strengthens trust with partners and regulators while protecting user rights.",
        ],
        "examples": [
            "A custody provider implements API-based Travel Rule messaging with encryption to minimize data leakage.",
            "A wallet developer publishes transparency reports describing security testing and how user data is handled.",
        ],
        "glossary": {
            "Travel Rule": "Requirement for certain financial institutions to share originator and beneficiary information on transfers.",
            "KYC": "Know Your Customer processes that verify user identity under regulatory frameworks.",
            "Custodial": "A service that holds private keys on behalf of users, taking on fiduciary responsibilities.",
        },
        "takeaways": [
            "Regulation shapes product design and data handling obligations.",
            "Non-custodial models reduce liability but still require thoughtful privacy practices.",
            "Transparent controls build confidence with users and partners.",
        ],
    },
    {
        "title": "Resilience and Recovery",
        "paragraphs": [
            "Business continuity planning covers hardware failures, data corruption, and human error in key management.",
            "Geographic redundancy for backups reduces correlated risks from natural disasters or regional outages.",
            "Regular checksum verification and test restores ensure that backups are usable when emergencies occur.",
            "Out-of-band communication channels are necessary during security events when primary systems may be compromised.",
            "Insurance considerations and contractual agreements should reflect actual risk profiles and recovery capabilities.",
        ],
        "examples": [
            "A multisig wallet keeps seeds in separate regions with access controls tied to role-based policies.",
            "A company keeps tamper-evident logs of backup handling and performs quarterly restore drills.",
        ],
        "glossary": {
            "Checksum": "Value used to verify data integrity across backups and transfers.",
            "BCP": "Business Continuity Plan outlining how operations continue during disruptions.",
            "Tamper-Evident": "Design that makes unauthorized access visible through seals or audit trails.",
        },
        "takeaways": [
            "Backups are only useful when regularly tested and secured.",
            "Redundancy across geography and roles reduces single points of failure.",
            "Communication plans must assume compromised systems during incidents.",
        ],
    },
    {
        "title": "User Experience for Self-Custody",
        "paragraphs": [
            "Good UX educates users about risks while keeping critical steps simple and well-explained.",
            "Progressive disclosure can introduce advanced features like coin control without overwhelming newcomers.",
            "Clear warnings about irreversible transactions and fee implications prevent common mistakes.",
            "Localization and accessibility features widen the audience for self-custody tools.",
            "Integrating hardware wallets via standards like HWI improves security without sacrificing usability.",
        ],
        "examples": [
            "A wallet surfaces optional coin labeling and selection for power users, while defaulting to privacy-friendly choices for beginners.",
            "An app guides users through test transactions and confirmations before handling larger amounts.",
        ],
        "glossary": {
            "Progressive Disclosure": "Design pattern that reveals advanced controls as users gain proficiency.",
            "HWI": "Hardware Wallet Interface standard that enables consistent integration of signing devices.",
            "Accessibility": "Designing interfaces usable by people with diverse abilities and contexts.",
        },
        "takeaways": [
            "UX decisions directly influence user safety and error rates.",
            "Offer safe defaults with the ability to customize once users are ready.",
            "Testing flows with real users reveals friction and misunderstanding early.",
        ],
    },
    {
        "title": "Applying Bitcoin in Business",
        "paragraphs": [
            "Businesses integrating Bitcoin must align treasury strategy, accounting, and custody with existing controls.",
            "Stable operations require reconciling on-chain data with invoices, point-of-sale records, and tax obligations.",
            "Segregation of duties between approval, signing, and reconciliation reduces fraud risk.",
            "Lightning payments can reduce fees for small transactions but demand liquidity planning and reliable nodes.",
            "Vendor and customer education reduce support load and errors during adoption phases.",
        ],
        "examples": [
            "A retailer uses automated invoicing with QR codes tied to monitored addresses and reconciles receipts via a full node.",
            "A services company pays international contractors over Lightning to avoid delays and high remittance fees.",
        ],
        "glossary": {
            "Reconciliation": "Process of matching transactions across systems to ensure records are accurate.",
            "Treasury": "Management of cash, reserves, and risk for an organization.",
            "Liquidity": "Availability of spendable funds in the required payment channel or account.",
        },
        "takeaways": [
            "Integrating Bitcoin touches finance, engineering, and compliance functions.",
            "Automation and strong record-keeping reduce operational risk.",
            "Lightning can unlock new markets but must be supported by monitoring and policies.",
        ],
    },
    {
        "title": "Capstone: Self-Verification",
        "paragraphs": [
            "The capstone lesson combines key themes: running a node, managing keys, and verifying payments end-to-end.",
            "Students practice constructing transactions, estimating fees, and validating confirmations with their own infrastructure.",
            "The exercise emphasizes minimizing trust in third parties and documenting assumptions at each step.",
            "Learners reflect on trade-offs between convenience, privacy, and resiliency for their specific context.",
            "Completion includes a checklist that can be reused for future wallet setups or audits.",
        ],
        "examples": [
            "Participants broadcast a test transaction from a hardware wallet, verify it on their node, and review mempool behavior.",
            "Teams write a short playbook describing how they would onboard a new employee with least privilege to wallet access.",
        ],
        "glossary": {
            "Capstone": "A culminating project that synthesizes multiple skills into a practical demonstration.",
            "Verification": "Process of independently confirming that data or actions meet expected rules and conditions.",
            "Checklist": "Structured list used to ensure critical steps are not missed during a procedure.",
        },
        "takeaways": [
            "Self-verification is the heart of Bitcoin’s trust model.",
            "Documenting procedures enables repeatability and team learning.",
            "Continuous practice keeps skills sharp as tools and network conditions evolve.",
        ],
    },
]


SECURITY_ESSENTIALS_LESSONS: List[LessonContent] = [
    {
        "title": "Threat Modeling Basics",
        "paragraphs": [
            "Threat modeling starts with identifying assets, adversaries, and potential attack surfaces before selecting controls.",
            "Bitcoin custody introduces unique risks: key theft, phishing, supply-chain attacks, and physical coercion.",
            "Personas include malicious insiders, opportunistic thieves, and motivated nation-state actors with advanced capabilities.",
            "Documenting assumptions helps prioritize mitigations that fit budget, team size, and operational tempo.",
            "Regular reviews keep the model updated as business processes, software, and attacker tactics evolve.",
        ],
        "examples": [
            "A small fund identifies its hot wallet as the highest-risk asset and applies spending limits with alerts.",
            "A family custody plan considers social engineering risks and requires verbal check-ins before approvals.",
        ],
        "glossary": {
            "Threat Model": "A structured representation of what you are defending, from whom, and how.",
            "Attack Surface": "All the points where an attacker could try to enter or extract data from a system.",
            "Adversary": "An entity with intent and capability to cause harm or loss.",
        },
        "takeaways": [
            "Clarity about assets and adversaries guides efficient control selection.",
            "Threat models must evolve with products, teams, and attacker techniques.",
            "Mitigations should be prioritized based on impact and feasibility.",
        ],
    },
    {
        "title": "Seed Phrase Protection",
        "paragraphs": [
            "Seed phrases are the root of wallet recovery; losing them or revealing them means losing funds.",
            "Use metal backups for fire and water resistance; avoid photographing or emailing seeds.",
            "Passphrases (BIP39) add another layer by deriving a different wallet if the base seed is compromised.",
            "Split backups like Shamir’s Secret Sharing can reduce single-point-of-failure risk but require careful coordination.",
            "Access logs and tamper-evident seals help detect unauthorized handling of backup materials.",
        ],
        "examples": [
            "A user engraves a seed phrase onto stainless steel plates stored in separate locations with tamper seals.",
            "An organization stores Shamir shares in different cities with two executives needed to reconstruct the seed.",
        ],
        "glossary": {
            "Seed Phrase": "List of words encoding the entropy used to derive wallet keys.",
            "Passphrase": "Additional secret that hardens a seed against physical compromise by altering derived keys.",
            "Shamir's Secret Sharing": "Algorithm to split a secret into parts requiring a threshold to reconstruct.",
        },
        "takeaways": [
            "Physical durability and secrecy are equally important for seed backups.",
            "Passphrases mitigate some physical compromise scenarios but must be memorable and backed up.",
            "Shared custody approaches reduce single points of failure but add coordination complexity.",
        ],
    },
    {
        "title": "Hardware Wallet Hygiene",
        "paragraphs": [
            "Hardware wallets isolate private keys from internet-connected devices, reducing malware exposure.",
            "Verify device authenticity and firmware signatures before first use to avoid supply-chain implants.",
            "Always confirm addresses on the device screen; clipboard or UI injection attacks can redirect funds.",
            "Maintain a clean signing environment by restricting USB devices and disabling autorun features on host computers.",
            "Keep firmware updated only from vendor-verified sources after verifying checksums and release notes.",
        ],
        "examples": [
            "An operator uses a dedicated laptop for signing, wipes it regularly, and pairs it only with vetted hardware wallets.",
            "A user compares the receiving address on the device screen with the intended recipient before approving a transaction.",
        ],
        "glossary": {
            "Supply-Chain Attack": "Compromise introduced before delivery, such as tampered packaging or modified firmware.",
            "Air-Gapped": "Environment physically isolated from networks to reduce attack vectors.",
            "Checksum": "Value verifying file integrity, ensuring firmware images are unaltered.",
        },
        "takeaways": [
            "Device provenance and on-device verification are critical to prevent address substitution.",
            "Dedicated signing environments limit cross-contamination from everyday browsing.",
            "Firmware updates should be deliberate and verified, not automatic.",
        ],
    },
    {
        "title": "Multisig Security Patterns",
        "paragraphs": [
            "Multisignature setups distribute control across devices, locations, or people to reduce single-key compromise risk.",
            "Policies should specify how many signatures are required for routine versus emergency spends, with documented roles.",
            "Geographic separation of signers mitigates physical coercion and environmental risks like fires or floods.",
            "Use descriptor-based wallets to ensure recoverability across software and to capture derivation paths.",
            "Training signers on social engineering avoidance is as important as the cryptography itself.",
        ],
        "examples": [
            "A business uses a 3-of-5 multisig with keys held by finance, security, and an external trustee to enable continuity if someone is unavailable.",
            "A family office maintains two hardware wallets in separate vaults and one in a trusted jurisdiction for travel contingencies.",
        ],
        "glossary": {
            "Quorum": "The number of required signatures out of the total in a multisig scheme.",
            "Descriptor Wallet": "Wallet configuration that explicitly describes script templates and derivation paths.",
            "Key Ceremony": "Formal process for generating and distributing keys with witnesses and documentation.",
        },
        "takeaways": [
            "Multisig reduces reliance on any single key or person, improving resilience.",
            "Clear policies and rehearsals are necessary so signers know how to respond under pressure.",
            "Descriptors and audits keep multisig setups maintainable over time.",
        ],
    },
    {
        "title": "Network Security and Nodes",
        "paragraphs": [
            "Bitcoin nodes benefit from network-layer protections such as firewalls, Tor routing, and restricted RPC credentials.",
            "Limit exposure of RPC endpoints; prefer whitelisting specific IPs and using authentication cookies.",
            "Monitor node logs for unusual peer connections, repeated authentication failures, or resource exhaustion.",
            "Use deterministic builds or verified binaries for node software to reduce supply-chain risk.",
            "Regularly verify backups of configuration and wallet descriptors to enable rebuilds after incidents.",
        ],
        "examples": [
            "A company deploys nodes behind VPNs and restricts RPC to internal addresses with role-based credentials.",
            "A home user runs the node over Tor, pairing mobile wallets via QR codes to avoid exposing IP addresses.",
        ],
        "glossary": {
            "RPC": "Remote Procedure Call interface used to control a Bitcoin node programmatically.",
            "Tor": "Privacy network that routes traffic through relays to obscure origin IP addresses.",
            "Deterministic Build": "Compilation process that produces identical binaries from the same source, enabling verification.",
        },
        "takeaways": [
            "Restricting network exposure and monitoring logs greatly reduces attack surfaces.",
            "Privacy-preserving connectivity protects users from surveillance and targeted attacks.",
            "Reliable backups and deterministic builds support trustworthy node operations.",
        ],
    },
    {
        "title": "Incident Response",
        "paragraphs": [
            "Incident response plans define how to detect, contain, eradicate, and recover from security events.",
            "Clear severity tiers drive decisions about communication, escalation, and whether to pause operations.",
            "During key compromise, priorities include isolating affected wallets, revoking access, and rotating credentials.",
            "Post-incident forensics should capture logs, device states, and user reports to understand root causes.",
            "Retrospectives must feed into improved controls, training, and monitoring to prevent recurrence.",
        ],
        "examples": [
            "A company freezes withdrawals and rotates signing keys after detecting unusual transaction patterns.",
            "An individual moves funds to a clean wallet after discovering malware and reinstalls operating systems from trusted media.",
        ],
        "glossary": {
            "Containment": "Steps taken to limit the spread or impact of an incident.",
            "Forensics": "Investigation techniques used to understand what happened during an incident.",
            "Retrospective": "Post-incident meeting to analyze causes and implement improvements.",
        },
        "takeaways": [
            "Prepared playbooks reduce chaos during stressful security events.",
            "Fast containment and communication protect funds and user trust.",
            "Learning from incidents strengthens defenses over time.",
        ],
    },
    {
        "title": "Physical Security",
        "paragraphs": [
            "Physical controls protect devices, backups, and people from theft or tampering.",
            "Use safes, locked cabinets, and tamper-evident bags for hardware wallets and seed plates.",
            "Access logs, cameras, and visitor policies deter unauthorized entry to sensitive areas.",
            "Travel policies should define how to transport signing devices and what to do if detained or coerced.",
            "Environmental protections like humidity control and fire suppression preserve backup materials over time.",
        ],
        "examples": [
            "An organization stores hardware wallets in a biometric safe with dual custody for access.",
            "A traveler carries a duress wallet with minimal funds and stores primary keys in a secure vault at home.",
        ],
        "glossary": {
            "Tamper-Evident": "Design that reveals if an item has been opened or altered.",
            "Duress Wallet": "A small, separate wallet intended to satisfy coercion without exposing primary holdings.",
            "Access Control": "Processes and technologies that regulate who can enter or use resources.",
        },
        "takeaways": [
            "Physical protections complement digital safeguards and must be documented.",
            "Travel policies reduce risk during border crossings or high-risk situations.",
            "Environmental considerations preserve the longevity of critical backups.",
        ],
    },
    {
        "title": "Backup and Recovery",
        "paragraphs": [
            "Backups should capture seeds, descriptors, and metadata needed to rebuild wallets and nodes.",
            "Test restores validate that backups are complete and that instructions are clear for responders.",
            "Redundant storage in distinct jurisdictions mitigates regional threats and legal risks.",
            "Encrypt backups at rest and in transit, using strong keys managed separately from production systems.",
            "Document recovery timelines and decision trees for who initiates restores under what conditions.",
        ],
        "examples": [
            "A business stores encrypted backups in two cloud providers and a physical safe, with quarterly restore drills.",
            "A family writes a sealed letter with recovery steps and contact information for trusted parties.",
        ],
        "glossary": {
            "Descriptor": "Specification of wallet structure that assists in restoration and interoperability.",
            "Key Escrow": "Holding encryption keys with a trusted third party or mechanism for recovery.",
            "Jurisdictional Diversity": "Placing assets in multiple legal regions to reduce correlated risks.",
        },
        "takeaways": [
            "Backups must be both secure and accessible to authorized responders.",
            "Regular drills ensure recovery steps are understood and practical.",
            "Geographic and provider diversity strengthen resilience.",
        ],
    },
    {
        "title": "Secure Software Practices",
        "paragraphs": [
            "Secure coding practices reduce vulnerabilities in wallet software and supporting services.",
            "Use reproducible builds, code reviews, and continuous integration security checks to catch defects early.",
            "Dependency management is critical; verify signatures and monitor for supply-chain advisories.",
            "Secrets management should keep API keys, seeds, and encryption keys out of source control.",
            "Logging must balance observability with privacy, avoiding sensitive data exposure in plaintext.",
        ],
        "examples": [
            "A team uses hardware security modules for signing critical binaries and enforces signed commits for releases.",
            "An open-source wallet project uses fuzz testing and static analysis to catch serialization bugs.",
        ],
        "glossary": {
            "Reproducible Build": "A build process that yields identical outputs, enabling verification of binaries against source.",
            "Static Analysis": "Automated examination of code to detect bugs or security issues without executing it.",
            "Secrets Management": "Systems and practices for securely storing and using confidential credentials.",
        },
        "takeaways": [
            "Software quality and security reviews protect users from catastrophic bugs.",
            "Supply-chain vigilance is essential for dependencies that handle keys or network data.",
            "Logging should inform without exposing private keys or sensitive metadata.",
        ],
    },
    {
        "title": "Lightning Security",
        "paragraphs": [
            "Lightning nodes must protect channel state data, as loss can lead to stolen funds if peers broadcast outdated states.",
            "Use watchtowers to monitor the blockchain for revoked commitments and automate penalty transactions.",
            "Limit exposure of node management interfaces and use macaroon or TLS certificate protections.",
            "Channel partner selection matters; choose peers with good uptime, reputation, and compatible policies.",
            "Backups should include channel databases and static channel backups, with clear restore procedures.",
        ],
        "examples": [
            "An operator encrypts macaroons, stores backups offsite, and tests restoring channels on a staging node.",
            "A merchant sets conservative channel policies and monitors for force closes or pending HTLCs that could indicate issues.",
        ],
        "glossary": {
            "Macaroon": "Authentication token used by Lightning implementations such as LND.",
            "Commitment Transaction": "Latest agreed-upon transaction representing channel state.",
            "Penalty Transaction": "Transaction that can claim funds if a peer broadcasts a revoked state.",
        },
        "takeaways": [
            "Lightning security hinges on safeguarding channel state and monitoring the chain.",
            "Peer selection and interface hardening reduce operational surprises.",
            "Backups and watchtowers provide essential safety nets.",
        ],
    },
    {
        "title": "Custody Models",
        "paragraphs": [
            "Custody can be self-managed, collaborative, or delegated to custodians; each has trade-offs in control and liability.",
            "Collaborative custody providers offer assisted recovery while leaving users in control of keys.",
            "Fully custodial services simplify UX but introduce counterparty and regulatory risk.",
            "Assess custodians for proof-of-reserves practices, insurance, and security transparency.",
            "Clear exit plans ensure users can migrate funds if a provider fails or policies change.",
        ],
        "examples": [
            "A startup chooses collaborative custody with a provider that holds one key in a 2-of-3 setup for recovery assistance.",
            "An individual audits a custodial exchange’s proof-of-reserves report before storing significant funds.",
        ],
        "glossary": {
            "Proof of Reserves": "Method for custodians to demonstrate solvency by proving asset holdings on-chain.",
            "Collaborative Custody": "Shared control model where a service holds a minority of keys to assist with recovery.",
            "Counterparty Risk": "Risk that a third party fails to meet obligations, leading to loss.",
        },
        "takeaways": [
            "Custody choices should match risk tolerance, expertise, and regulatory context.",
            "Proof-of-reserves and transparency help evaluate custodial partners.",
            "Exit strategies prevent lock-in and support user autonomy.",
        ],
    },
    {
        "title": "Human Factors",
        "paragraphs": [
            "Many breaches stem from human error: misaddressed transactions, phishing, and poor device hygiene.",
            "Training should include recognizing malicious links, verifying domains, and using password managers.",
            "Encourage a culture where reporting suspected incidents is rewarded, not punished.",
            "Onboarding checklists ensure new staff follow secure practices from day one.",
            "Regular audits validate that policies are followed and that employees understand why controls exist.",
        ],
        "examples": [
            "An organization runs phishing simulations and follows up with coaching rather than blame.",
            "A team uses shared password managers with role-based access and enforces hardware-based MFA.",
        ],
        "glossary": {
            "Password Manager": "Tool that stores and generates strong credentials, reducing reuse and phishing risk.",
            "Security Awareness": "Understanding of risks and behaviors that reduce the likelihood of incidents.",
            "Onboarding": "Process of integrating new personnel, including granting access and training on policies.",
        },
        "takeaways": [
            "Humans remain a critical security layer; training and supportive culture reduce mistakes.",
            "Tools like password managers and MFA raise the baseline for everyday security.",
            "Regular, empathetic communication keeps teams engaged with security goals.",
        ],
    },
    {
        "title": "Policy and Compliance",
        "paragraphs": [
            "Documented policies for access, spending limits, and device usage create consistent expectations.",
            "Compliance frameworks like SOC 2 or ISO 27001 can guide control selection and evidence gathering.",
            "Change management processes ensure that wallet configurations and software updates are reviewed and approved.",
            "Privacy regulations impact how user data is stored and shared, requiring data minimization and retention policies.",
            "Auditable logs support internal reviews and external assessments while enabling forensic investigations.",
        ],
        "examples": [
            "A company sets daily withdrawal limits and requires two approvals for amounts above a threshold.",
            "An engineering team uses ticketing and peer review for any changes to signing infrastructure.",
        ],
        "glossary": {
            "SOC 2": "Security and privacy auditing standard often requested by enterprise customers.",
            "Change Management": "Process of planning, reviewing, and documenting modifications to systems.",
            "Data Minimization": "Limiting collected data to what is necessary for a defined purpose.",
        },
        "takeaways": [
            "Policies turn security goals into enforceable behaviors.",
            "Frameworks provide structure but should be adapted to Bitcoin-specific risks.",
            "Audits require accurate logs and disciplined change control.",
        ],
    },
    {
        "title": "Advanced Vaulting",
        "paragraphs": [
            "Vault architectures combine timelocks, multisig, and spending limits to delay or block unauthorized withdrawals.",
            "Pre-signed transactions and recovery paths must be tested to ensure they execute as expected when triggered.",
            "Watchtowers or guardians can monitor for abnormal spends and broadcast cancel transactions.",
            "Compartmentalization separates hot, warm, and cold storage tiers based on access needs and risk profiles.",
            "Automation should be carefully scoped; human review is essential for high-value vault movements.",
        ],
        "examples": [
            "A fund uses a 2-of-3 vault with a 30-day timelock on the final key, providing time to react to suspicious withdrawals.",
            "A team creates pre-signed emergency transactions that can be broadcast if signers are unavailable.",
        ],
        "glossary": {
            "Vault": "A wallet design that adds friction or delays to spending to protect against fast theft.",
            "Pre-signed Transaction": "Transaction signed in advance, used for recovery or scheduled actions.",
            "Hot/Warm/Cold": "Storage tiers reflecting how frequently funds are accessed and the level of isolation.",
        },
        "takeaways": [
            "Vaults create defense-in-depth through enforced delays and oversight.",
            "Testing emergency paths prevents surprises when they are needed most.",
            "Storage tiers let teams balance agility and safety across workflows.",
        ],
    },
    {
        "title": "Communications Security",
        "paragraphs": [
            "Secure communication channels protect coordination around key management and incident response.",
            "Use end-to-end encrypted messengers with verified safety numbers for sensitive discussions.",
            "Out-of-band verification, such as voice callbacks, helps confirm transaction requests and approvals.",
            "Email signing (PGP) or document signing ensures policy changes and procedures are authentic.",
            "Limit distribution lists for sensitive information to reduce leakage risk.",
        ],
        "examples": [
            "Teams verify payment instructions via encrypted chat and confirm with a short voice call before signing.",
            "A company signs policy documents with PGP and stores fingerprints in an internal directory for verification.",
        ],
        "glossary": {
            "End-to-End Encryption": "Communication where only the participants can read messages, not the service provider.",
            "Safety Number": "Identifier used to verify that an encrypted messaging session is not being intercepted.",
            "PGP": "Pretty Good Privacy, a standard for encrypting and signing data and communications.",
        },
        "takeaways": [
            "Verified, encrypted communication prevents spoofed requests and leakage.",
            "Out-of-band checks add assurance before funds move.",
            "Signing policies builds trust and accountability for operational changes.",
        ],
    },
    {
        "title": "Case Studies and Drills",
        "paragraphs": [
            "Analyzing real-world incidents reveals how layered defenses succeed or fail under pressure.",
            "Tabletop drills simulate phishing, lost devices, or insider threats to test response speed and clarity.",
            "Metrics such as time-to-detect and time-to-contain guide improvement priorities.",
            "Sharing lessons across teams fosters a learning culture and avoids repeated mistakes.",
            "Benchmarks from industry standards can inform maturity roadmaps without dictating every control.",
        ],
        "examples": [
            "A team reenacts a historical exchange hack to see how modern controls would fare and what gaps remain.",
            "An annual drill tests how quickly signers can move funds to an emergency wallet using printed procedures.",
        ],
        "glossary": {
            "Tabletop": "Discussion-based exercise that walks through a hypothetical scenario to test plans.",
            "Maturity Model": "Framework describing stages of capability development.",
            "Postmortem": "Write-up analyzing an incident or outage to extract improvements.",
        },
        "takeaways": [
            "Regular practice surfaces gaps in tooling, training, and communication.",
            "Metrics help prioritize where to invest security effort.",
            "Learning from others accelerates your own security maturity.",
        ],
    },
]


OPERATIONS_LAB_LESSONS: List[LessonContent] = [
    {
        "title": "Portal Accounts and Data Safety",
        "paragraphs": [
            "AdaptBTC’s learning portal keeps usernames and bcrypt-hashed passwords inside a SQLite database that is initialized automatically on first login or registration.",
            "Session data is stored server-side, and Flask-Session ensures tokens cannot be tampered with from the browser.",
            "Audit-friendly logging of quiz attempts and lesson completion provides a paper trail for compliance teams.",
            "The stack is container-ready, making it simple to deploy behind a reverse proxy with HTTPS and environment-based secrets.",
            "Students experience a real authentication flow instead of a mockup, reinforcing operational security fundamentals.",
        ],
        "examples": [
            "Learners register, log out, and return later with their credentials preserved by the database.",
            "Team leads export quiz scores to confirm onboarding milestones before provisioning production access.",
        ],
        "glossary": {
            "Bcrypt": "Password hashing algorithm that applies adaptive work factors to resist brute force attacks.",
            "Session": "Server-tracked state that maps a browser cookie to authenticated user data.",
            "Persistent Store": "Database or disk-backed system that survives server restarts and redeployments.",
        },
        "takeaways": [
            "The portal uses the same primitives you would deploy to production—hashing, sessions, and durable storage.",
            "Visibility into attempts and completions makes the training auditable.",
            "Secure defaults keep account data safe without extra configuration.",
        ],
        "diagram": "<div class='chart-card'><canvas class=\"lesson-chart\" data-points=\"35,62,88\" data-labels=\"Signups|Active|Certificates\" data-color=\"#2563eb\"></canvas><p class='chart-note'>Live enrollment metrics rendered from the same chart helper used across lessons.</p></div>",
    },
    {
        "title": "Toolchain Tour: Wallets, Consoles, and Compliance",
        "paragraphs": [
            "The Wallet Generator on the tools page produces fresh bech32m addresses and QR codes, ideal for sandbox drills.",
            "Console snippets walk through fee estimation, UTXO inspection, and Replace-By-Fee so learners can rehearse on testnet.",
            "Structured lesson pages link directly to these utilities, encouraging immediate hands-on validation.",
            "Charts and inline diagrams pair concepts (like UTXO sets) with the on-site explorers and calculators.",
            "Compliance notes remind teams to log wallet derivations and keep descriptors alongside cold storage inventories.",
        ],
        "examples": [
            "A student launches the wallet generator, sweeps a testnet faucet deposit, and watches confirmations from their dashboard.",
            "A finance lead exports CSV data from the reporting console to reconcile payouts during a fee spike.",
        ],
        "glossary": {
            "Descriptor": "Structured string that documents how addresses are derived and what scripts they use.",
            "RBF": "Replace-By-Fee, a way to increase fees on unconfirmed transactions.",
            "Console": "Browser-based command surface for quick tasks without a full local toolchain.",
        },
        "takeaways": [
            "Every concept links to a working AdaptBTC tool to reinforce learning.",
            "On-chain hygiene—like descriptor tracking—starts during training, not after deployment.",
            "Small exercises build confidence before learners touch production wallets.",
        ],
        "diagram": "<div class='chart-card'><canvas class=\"lesson-chart\" data-points=\"15,40,68,92\" data-labels=\"Wallets|RBF Tests|Batching|Reports\" data-color=\"#7c3aed\"></canvas><p class='chart-note'>Feature usage across the AdaptBTC toolkit during live labs.</p></div>",
    },
    {
        "title": "Interactive Labs and Visual Dashboards",
        "paragraphs": [
            "Each lesson page embeds charts that render client-side from structured data attributes, demonstrating progressive disclosure of analytics.",
            "Learners can toggle overlay tips to reveal the rationale for privacy-friendly defaults or security guardrails.",
            "Generated SVG timelines illustrate transaction lifecycles from mempool broadcast to block inclusion and settlement.",
            "Callout boxes link back to your node monitoring dashboard so students correlate theory with real signals.",
            "Consistency in typography, spacing, and gradients makes the portal feel premium while staying lightweight.",
        ],
        "examples": [
            "A chart animates fee percentile changes after a simulated congestion event, prompting students to pick an RBF strategy.",
            "Timeline graphics show how CPFP brings stuck transactions back into miner priority queues.",
        ],
        "glossary": {
            "SVG": "Scalable Vector Graphics, ideal for crisp diagrams that adapt to screen sizes.",
            "Progressive Disclosure": "Design approach where complex details appear once a learner is ready for them.",
            "Mempool": "Set of unconfirmed transactions known to a node.",
        },
        "takeaways": [
            "Visuals and interactivity make fee strategy and privacy topics stick.",
            "Dashboards bridge classroom content with production monitoring.",
            "Design polish reduces cognitive load so learners focus on the material.",
        ],
        "diagram": "<div class='chart-card'><canvas class=\"lesson-chart\" data-points=\"22,38,57,84\" data-labels=\"Mempool|RBF|CPFP|Settlement\" data-color=\"#0ea5e9\"></canvas><p class='chart-note'>Animated timelines pair with the embedded quiz to reinforce fee escalation paths.</p></div>",
    },
    {
        "title": "Capstone: Automated Runbooks",
        "paragraphs": [
            "The capstone challenges learners to design a runbook that combines lesson checklists, wallet generator outputs, and quiz results into a repeatable workflow.",
            "Students map each step to an AdaptBTC tool and identify where human review is required versus automation.",
            "An example script demonstrates how to pull quiz history to verify readiness before granting hot wallet access.",
            "Graphs summarize how long each step should take so teams can benchmark onboarding velocity.",
            "Completion unlocks a certificate and a downloadable JSON template for reuse inside your organization.",
        ],
        "examples": [
            "An operations lead builds a checklist that starts with portal registration, moves through wallet drills, and ends with a signed certificate.",
            "A developer wraps wallet generator output into a deployment pipeline to seed staging environments nightly.",
        ],
        "glossary": {
            "Runbook": "Detailed, repeatable instructions for executing operational tasks reliably.",
            "Automation": "Use of scripts or tools to perform tasks with minimal manual intervention.",
            "Benchmark": "Baseline measurement used to compare performance over time.",
        },
        "takeaways": [
            "Runbooks keep production behavior aligned with training guidance.",
            "Automation should still surface checkpoints for human approval where risk is high.",
            "Capturing time-to-completion helps forecast staffing needs for new deployments.",
        ],
        "diagram": "<div class='chart-card'><canvas class=\"lesson-chart\" data-points=\"18,36,52,70,96\" data-labels=\"Register|Wallet Lab|Quiz|Runbook|Certificate\" data-color=\"#16a34a\"></canvas><p class='chart-note'>Step-by-step velocity chart to plan smooth onboarding.</p></div>",
    },
]


BITCOIN_101_QUIZ: List[Question] = [
    {
        "prompt": "Why does Bitcoin use proof-of-work instead of a central timestamp server?",
        "options": [
            "To slow the network down intentionally",
            "To allow anyone to compete to order transactions without trusting a coordinator",
            "To reduce energy consumption",
            "To ensure blocks are always exactly 1 MB",
        ],
        "answer": 1,
        "explanation": "Proof-of-work provides decentralized ordering and Sybil resistance by making it costly to propose blocks.",
    },
    {
        "prompt": "What is the main benefit of running your own Bitcoin node?",
        "options": [
            "It guarantees faster confirmations",
            "It lets you enforce consensus rules yourself without trusting third parties",
            "It pays you interest on your holdings",
            "It removes the need for backups",
        ],
        "answer": 1,
        "explanation": "Self-verification through your own node means you decide which transactions and blocks are valid.",
    },
    {
        "prompt": "Why are bech32 addresses recommended over legacy formats?",
        "options": ["They hold more bitcoin", "They reduce transaction weight and include better error detection", "They are required by law", "They change the consensus rules"],
        "answer": 1,
        "explanation": "Bech32 encodes SegWit outputs efficiently, lowering fees and catching typos with strong checksums.",
    },
    {
        "prompt": "How does batching help fee efficiency?",
        "options": [
            "By speeding up block times",
            "By combining multiple outputs into one transaction, reducing per-payment overhead",
            "By reducing block size limits",
            "By eliminating the need for signatures",
        ],
        "answer": 1,
        "explanation": "Batching amortizes fixed transaction components across many recipients, lowering total vbytes per payment.",
    },
    {
        "prompt": "What is an HTLC used for in the Lightning Network?",
        "options": [
            "Storing long-term funds",
            "Conditionally routing payments with hash preimages and timelocks",
            "Mining new bitcoins",
            "Encrypting wallet backups",
        ],
        "answer": 1,
        "explanation": "HTLCs secure multi-hop payments by requiring a secret preimage reveal before expiry.",
    },
    {
        "prompt": "Which practice improves on-chain privacy?",
        "options": ["Address reuse", "Merging all UTXOs often", "Using coin control to separate funds", "Posting keys online"],
        "answer": 2,
        "explanation": "Coin control avoids unnecessary linkage between funds from different contexts, improving privacy.",
    },
    {
        "prompt": "Why is Replace-By-Fee (RBF) useful?",
        "options": ["It cancels confirmed transactions", "It lets senders bump fees on unconfirmed transactions to speed confirmation", "It changes block rewards", "It hides transactions"],
        "answer": 1,
        "explanation": "RBF allows adjusting fees for transactions still in the mempool, preventing them from getting stuck.",
    },
    {
        "prompt": "What risk does address reuse create?",
        "options": ["Higher fees", "Lower block reward", "Linkability of balances and payment history", "Invalid transactions"],
        "answer": 2,
        "explanation": "Reusing addresses makes it easy for observers to connect multiple payments to the same owner.",
    },
    {
        "prompt": "Why do nodes reject blocks that violate consensus rules even if they have valid proof-of-work?",
        "options": [
            "To punish miners",
            "Because proof-of-work alone is insufficient; rules prevent inflation and invalid spends",
            "Because blocks must be under 500 kB",
            "Because miners have no influence",
        ],
        "answer": 1,
        "explanation": "Nodes enforce rules to protect scarcity and validity; proof-of-work orders blocks but cannot override consensus.",
    },
    {
        "prompt": "What does channel liquidity affect on Lightning?",
        "options": ["Block reward size", "Ability to route payments in a given direction", "Mining difficulty", "Wallet seed entropy"],
        "answer": 1,
        "explanation": "Liquidity determines whether sufficient capacity exists to forward payments from sender to receiver.",
    },
    {
        "prompt": "Why are descriptors valuable?",
        "options": ["They increase block size", "They document script structure and derivation paths for portability", "They add more fees", "They replace signatures"],
        "answer": 1,
        "explanation": "Descriptors express how addresses are derived and what scripts they use, aiding recovery and interoperability.",
    },
    {
        "prompt": "How does CPFP accelerate a transaction?",
        "options": ["By deleting the parent", "By spending an output with a higher-fee child that drags the parent into a block", "By disabling mempools", "By reducing signatures"],
        "answer": 1,
        "explanation": "A high-fee child transaction can incentivize miners to include its low-fee parent due to package mining.",
    },
    {
        "prompt": "What role do watchtowers play for Lightning users?",
        "options": ["They mine blocks", "They monitor for revoked states and broadcast penalties if needed", "They generate seeds", "They replace routers"],
        "answer": 1,
        "explanation": "Watchtowers keep watch for dishonest channel closures and act to protect offline users.",
    },
    {
        "prompt": "Why is progressive disclosure helpful in wallet UX?",
        "options": ["It hides bugs", "It reveals advanced features gradually so beginners are not overwhelmed", "It reduces seed length", "It prevents backups"],
        "answer": 1,
        "explanation": "Gradually exposing complexity improves adoption while still enabling expert controls.",
    },
    {
        "prompt": "What is the purpose of a pruned node?",
        "options": ["To change consensus rules", "To validate blocks while discarding old data to save disk space", "To mint coins faster", "To bypass signatures"],
        "answer": 1,
        "explanation": "Pruned nodes perform full validation but keep only recent blocks, reducing storage needs.",
    },
]


SECURITY_ESSENTIALS_QUIZ: List[Question] = [
    {
        "prompt": "What is the primary goal of threat modeling?",
        "options": ["Eliminate all risk", "Identify assets, adversaries, and controls that reduce risk", "Speed up transactions", "Comply with taxes"],
        "answer": 1,
        "explanation": "Threat modeling clarifies what you defend and how, guiding prioritized mitigations.",
    },
    {
        "prompt": "Why are metal backups recommended for seeds?",
        "options": ["They are cheaper", "They resist fire and water better than paper", "They are easier to photograph", "They allow online sharing"],
        "answer": 1,
        "explanation": "Metal backups endure physical hazards that destroy paper, preserving recovery data.",
    },
    {
        "prompt": "What advantage does multisig offer?",
        "options": ["Lower transaction fees", "Distribution of key control to avoid single points of failure", "Faster confirmations", "Unlimited supply"],
        "answer": 1,
        "explanation": "Multisig spreads trust so no single compromised key can move funds alone.",
    },
    {
        "prompt": "How should RPC access to a node be handled?",
        "options": ["Expose it to the internet", "Restrict to trusted networks and authenticate requests", "Disable logs", "Share credentials"],
        "answer": 1,
        "explanation": "Limiting RPC to trusted origins and requiring authentication minimizes attack surface.",
    },
    {
        "prompt": "What is a common first step when key compromise is suspected?",
        "options": ["Ignore it", "Isolate affected wallets and rotate credentials", "Post on social media", "Increase block size"],
        "answer": 1,
        "explanation": "Containment involves isolating risky systems and issuing new keys to stop unauthorized access.",
    },
    {
        "prompt": "Which practice improves travel security with hardware wallets?",
        "options": ["Carrying all seeds together", "Using duress setups and storing primary keys at home", "Disabling PINs", "Using hotel safes without locks"],
        "answer": 1,
        "explanation": "Minimizing carried secrets and planning for coercion reduces risk during travel.",
    },
    {
        "prompt": "Why conduct backup restore drills?",
        "options": ["To waste time", "To verify backups are complete and usable under stress", "To lower fees", "To speed up mining"],
        "answer": 1,
        "explanation": "Drills reveal missing steps or corrupted data before a real emergency occurs.",
    },
    {
        "prompt": "What secures Lightning channel state when you are offline?",
        "options": ["Proof-of-work", "Watchtowers monitoring for revoked commitments", "Bigger blocks", "Seed reuse"],
        "answer": 1,
        "explanation": "Watchtowers detect and respond to dishonest closures while you are offline.",
    },
    {
        "prompt": "What is proof-of-reserves used for?",
        "options": ["To speed up confirmations", "To demonstrate that a custodian controls assets equal to liabilities", "To mine blocks", "To sign emails"],
        "answer": 1,
        "explanation": "Proof-of-reserves builds trust by showing holdings that match or exceed user balances.",
    },
    {
        "prompt": "Why favor end-to-end encryption for operational communication?",
        "options": ["It reduces battery usage", "It prevents service providers or attackers from reading sensitive coordination", "It mines coins", "It replaces backups"],
        "answer": 1,
        "explanation": "E2EE keeps transaction approvals and incident updates confidential and authentic.",
    },
    {
        "prompt": "How do tabletop exercises help security?",
        "options": ["They slow teams", "They rehearse scenarios to uncover gaps in plans and tools", "They replace audits", "They remove the need for backups"],
        "answer": 1,
        "explanation": "Practice exposes unclear roles, missing data, and unrealistic assumptions before real incidents occur.",
    },
    {
        "prompt": "What is a key reason to separate hot, warm, and cold storage tiers?",
        "options": ["For aesthetics", "To align access speed with risk exposure and controls", "To increase taxes", "To share keys widely"],
        "answer": 1,
        "explanation": "Tiering balances convenience against security by isolating long-term holdings from frequent spends.",
    },
    {
        "prompt": "What should accompany policy changes?",
        "options": ["Unsigned emails", "Documented approvals and signed change logs", "Verbal rumors", "Automatic deployment without review"],
        "answer": 1,
        "explanation": "Change management with signatures and logs creates accountability and auditability.",
    },
    {
        "prompt": "Which human factor control reduces credential theft?",
        "options": ["Password reuse", "Hardware-based multifactor authentication", "Sharing seeds", "Plaintext credential storage"],
        "answer": 1,
        "explanation": "Hardware MFA makes phishing and credential stuffing harder by requiring physical presence.",
    },
    {
        "prompt": "Why is peer selection important for Lightning nodes?",
        "options": ["Peers set block rewards", "Reliable peers improve uptime, routing success, and reduce risk of bad states", "Peers change subsidies", "Peers sign your taxes"],
        "answer": 1,
        "explanation": "Stable, reputable peers lower the likelihood of channel disputes and failed payments.",
    },
]


OPERATIONS_LAB_QUIZ: List[Question] = [
    {
        "prompt": "Why does the portal hash passwords with bcrypt instead of storing them directly?",
        "options": [
            "It makes logins faster",
            "Hashing protects user secrets even if the database is copied",
            "It avoids using HTTPS",
            "It removes the need for backups",
        ],
        "answer": 1,
        "explanation": "Bcrypt’s adaptive hashing slows brute force attempts and keeps raw passwords out of storage.",
    },
    {
        "prompt": "What does the session manager store to keep users logged in?",
        "options": ["Plaintext passwords", "A server-side key that maps the browser cookie to a username", "Seed phrases", "Hardware wallet firmware"],
        "answer": 1,
        "explanation": "The portal keeps login state on the server, avoiding sensitive data in the browser.",
    },
    {
        "prompt": "How do lessons link to AdaptBTC tooling?",
        "options": [
            "They require a separate download",
            "Each lesson embeds calls-to-action that open the wallet generator, fee consoles, or dashboards",
            "They only show screenshots",
            "They block navigation to tools",
        ],
        "answer": 1,
        "explanation": "Inline tool links encourage immediate practice with the same utilities offered on the site.",
    },
    {
        "prompt": "What powers the lesson graphs displayed under each chapter?",
        "options": [
            "Server-side PDFs",
            "Client-side canvas rendering driven by data attributes on each lesson",
            "Static images only",
            "External analytics vendors",
        ],
        "answer": 1,
        "explanation": "Lightweight canvas drawings give interactive visuals without extra dependencies.",
    },
    {
        "prompt": "Why is it important to tie quiz history to onboarding runbooks?",
        "options": ["To slow the process", "To prove readiness before granting wallet access", "To change consensus rules", "To avoid documentation"],
        "answer": 1,
        "explanation": "Quiz scores offer evidence that learners understand the safeguards before handling funds.",
    },
    {
        "prompt": "What role do dashboards play in the Operations Lab course?",
        "options": ["They replace backups", "They visualize mempool health, fee pressure, and enrollment metrics", "They mine new blocks", "They remove authentication"],
        "answer": 1,
        "explanation": "Dashboards bridge theory to real signals like confirmation targets and learner progress.",
    },
    {
        "prompt": "How do interactive timelines help learners with fee management?",
        "options": ["They slow confirmations", "They show how RBF and CPFP change transaction priority through each stage", "They disable nodes", "They hide mempool data"],
        "answer": 1,
        "explanation": "Timelines make the effect of fee bumping and package mining concrete and memorable.",
    },
    {
        "prompt": "What makes the portal design feel consistent and premium?",
        "options": ["Random fonts", "Aligned spacing, shared gradients, and reusable components across lessons and quizzes", "No CSS", "Hard-coded inline styles only"],
        "answer": 1,
        "explanation": "Shared design tokens and components keep the learning experience polished across pages.",
    },
]
