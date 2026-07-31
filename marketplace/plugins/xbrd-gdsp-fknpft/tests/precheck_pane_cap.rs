use xbreed::precheck::{accepts_team_size, MAX_TEAM_SIZE};

#[test]
fn sole_maximum_is_16() {
    assert_eq!(MAX_TEAM_SIZE, 16);
}

#[test]
fn accepts_entire_inclusive_range() {
    assert!(accepts_team_size(0));
    assert!(accepts_team_size(1));
    assert!(accepts_team_size(15));
    assert!(accepts_team_size(16));
}

#[test]
fn rejects_values_above_maximum() {
    assert!(!accepts_team_size(17));
    assert!(!accepts_team_size(u32::MAX));
}
