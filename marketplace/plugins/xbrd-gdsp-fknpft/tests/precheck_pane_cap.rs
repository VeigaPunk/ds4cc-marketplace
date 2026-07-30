use xbreed::precheck::{accepts_team_size, MAX_TEAM_SIZE};

#[test]
fn sole_maximum_is_1024() {
    assert_eq!(MAX_TEAM_SIZE, 1024);
}

#[test]
fn accepts_entire_inclusive_range() {
    assert!(accepts_team_size(0));
    assert!(accepts_team_size(1));
    assert!(accepts_team_size(1023));
    assert!(accepts_team_size(1024));
}

#[test]
fn rejects_values_above_maximum() {
    assert!(!accepts_team_size(1025));
    assert!(!accepts_team_size(u32::MAX));
}
