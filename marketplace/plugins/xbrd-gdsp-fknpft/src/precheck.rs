/// Sole maximum accepted team size.
pub const MAX_TEAM_SIZE: u32 = 1024;

/// Return whether a requested team size is within the inclusive supported range.
pub fn accepts_team_size(team_size: u32) -> bool {
    team_size <= MAX_TEAM_SIZE
}
