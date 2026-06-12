UPDATE problems SET description = 'A flock of chirps has discovered a collection of energy seeds represented by the array `nums`.

Your task is to find two distinct seeds whose combined energy equals the target value `target`.

Return the indices of the two seeds.

### Notes
* Exactly one valid pair exists.
* A seed cannot be used twice.
* The indices may be returned in any order.

### Example
Input:
```text
nums = [2,7,11,15]
target = 9
```
Output:
```text
[0,1]
```
Explanation:
The energy values at indices `0` and `1` sum to `9`.', description_md = 'A flock of chirps has discovered a collection of energy seeds represented by the array `nums`.

Your task is to find two distinct seeds whose combined energy equals the target value `target`.

Return the indices of the two seeds.

### Notes
* Exactly one valid pair exists.
* A seed cannot be used twice.
* The indices may be returned in any order.

### Example
Input:
```text
nums = [2,7,11,15]
target = 9
```
Output:
```text
[0,1]
```
Explanation:
The energy values at indices `0` and `1` sum to `9`.' WHERE slug = 'two-sum';

UPDATE problems SET description = 'While building a nest, a chirp records a sequence of structural symbols:
```text
( ) { } [ ]
```
A nest blueprint is considered stable if:
* Every opening symbol has a matching closing symbol.
* Symbols close in the correct order.
* No closing symbol appears without its corresponding opening symbol.

Given a string `s`, determine whether the blueprint is stable.

### Example
Input:
```text
s = "()[]{}"
```
Output:
```text
true
```', description_md = 'While building a nest, a chirp records a sequence of structural symbols:
```text
( ) { } [ ]
```
A nest blueprint is considered stable if:
* Every opening symbol has a matching closing symbol.
* Symbols close in the correct order.
* No closing symbol appears without its corresponding opening symbol.

Given a string `s`, determine whether the blueprint is stable.

### Example
Input:
```text
s = "()[]{}"
```
Output:
```text
true
```' WHERE slug = 'valid-parentheses';

UPDATE problems SET description = 'A migration route is represented as a singly linked chain of waypoints.

Each waypoint points to the next destination.

Your task is to reverse the route so that travel begins from the final waypoint and proceeds back to the start.

Return the head of the reversed route.

### Example
Input:
```text
1 → 2 → 3 → 4 → 5
```
Output:
```text
5 → 4 → 3 → 2 → 1
```', description_md = 'A migration route is represented as a singly linked chain of waypoints.

Each waypoint points to the next destination.

Your task is to reverse the route so that travel begins from the final waypoint and proceeds back to the start.

Return the head of the reversed route.

### Example
Input:
```text
1 → 2 → 3 → 4 → 5
```
Output:
```text
5 → 4 → 3 → 2 → 1
```' WHERE slug = 'reverse-linked-list';

UPDATE problems SET description = 'A young chirp is trying to reach the top branch of a tree.

The branch is `n` levels above the ground.

At each move, the chirp may climb either:
* 1 branch level
* 2 branch levels

Determine how many distinct ways the chirp can reach the top.

### Example
Input:
```text
n = 3
```
Output:
```text
3
```
Explanation:
```text
1 + 1 + 1
1 + 2
2 + 1
```', description_md = 'A young chirp is trying to reach the top branch of a tree.

The branch is `n` levels above the ground.

At each move, the chirp may climb either:
* 1 branch level
* 2 branch levels

Determine how many distinct ways the chirp can reach the top.

### Example
Input:
```text
n = 3
```
Output:
```text
3
```
Explanation:
```text
1 + 1 + 1
1 + 2
2 + 1
```' WHERE slug = 'climbing-stairs';

UPDATE problems SET description = 'Two chirp colonies maintain their seed inventories in sorted order.

You are given:
* `nums1`
* `nums2`

Both arrays are sorted in non-decreasing order.

Merge the inventories into a single sorted sequence.

### Example
Input:
```text
nums1 = [1,2,3]
nums2 = [2,5,6]
```
Output:
```text
[1,2,2,3,5,6]
```', description_md = 'Two chirp colonies maintain their seed inventories in sorted order.

You are given:
* `nums1`
* `nums2`

Both arrays are sorted in non-decreasing order.

Merge the inventories into a single sorted sequence.

### Example
Input:
```text
nums1 = [1,2,3]
nums2 = [2,5,6]
```
Output:
```text
[1,2,2,3,5,6]
```' WHERE slug = 'merge-sorted-arrays';

UPDATE problems SET description = 'A chirp records daily energy gains and losses in an integer array `nums`.

A continuous segment of days is called a flight streak.

Find the flight streak with the highest total energy and return its sum.

### Example
Input:
```text
nums = [-2,1,-3,4,-1,2,1,-5,4]
```
Output:
```text
6
```
Explanation:
The best streak is:
```text
[4,-1,2,1]
```
whose total energy is:
```text
6
```', description_md = 'A chirp records daily energy gains and losses in an integer array `nums`.

A continuous segment of days is called a flight streak.

Find the flight streak with the highest total energy and return its sum.

### Example
Input:
```text
nums = [-2,1,-3,4,-1,2,1,-5,4]
```
Output:
```text
6
```
Explanation:
The best streak is:
```text
[4,-1,2,1]
```
whose total energy is:
```text
6
```' WHERE slug = 'maximum-subarray';
