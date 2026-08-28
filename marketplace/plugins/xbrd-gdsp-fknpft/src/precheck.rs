/// Certified maximum accepted team size.
///
/// The host remains authoritative about how many execution slots are actually
/// available. This precheck exists only to keep the XBGST stack from exceeding
/// its certified 64-slot contract; it must not introduce a smaller local cap.
pub const MAX_TEAM_SIZE: u32 = 64;

/// Return whether a requested team size is within the inclusive supported range.
pub fn accepts_team_size(team_size: u32) -> bool {
    team_size <= MAX_TEAM_SIZE
}
