use xbreed::precheck::{accepts_team_size, MAX_TEAM_SIZE};

#[test]
fn certified_maximum_is_64() {
    assert_eq!(MAX_TEAM_SIZE, 64);
}

#[test]
fn accepts_entire_inclusive_range() {
    assert!(accepts_team_size(0));
    assert!(accepts_team_size(1));
    assert!(accepts_team_size(63));
    assert!(accepts_team_size(64));
}

#[test]
fn rejects_values_above_maximum() {
    assert!(!accepts_team_size(65));
    assert!(!accepts_team_size(u32::MAX));
}
