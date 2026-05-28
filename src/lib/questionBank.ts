// Question bank for auto-provisioning daily practice (LeetCode style)
// Each entry has string JSON for boilerplate and test_cases fields

export const codingQuestionBank = [
  {
    id: 'q_two_sum',
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume each input has exactly one solution, and you may not use the same element twice.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: nums[0] + nums[1] = 2 + 7 = 9',
    difficulty: 'easy' as const,
    boilerplate: JSON.stringify({
      javascript: 'function twoSum(nums, target) {\n    // Write your solution here\n    \n}',
      python: 'def twoSum(nums, target):\n    # Write your solution here\n    pass',
      java: 'public class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}'
    }),
    test_cases: JSON.stringify([
      { input: '[[2,7,11,15], 9]', expected_output: '[0,1]' },
      { input: '[[3,2,4], 6]', expected_output: '[1,2]' },
      { input: '[[3,3], 6]', expected_output: '[0,1]' }
    ]),
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.'
  },
  {
    id: 'q_valid_palindrome',
    title: 'Valid Palindrome',
    description: 'A phrase is a palindrome if, after converting all uppercase letters into lowercase and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nExample:\nInput: s = "A man, a plan, a canal: Panama"\nOutput: true\nExplanation: "amanaplanacanalpanama" is a palindrome.',
    difficulty: 'easy' as const,
    boilerplate: JSON.stringify({
      javascript: 'function isPalindrome(s) {\n    // Write your solution here\n    \n}',
      python: 'def isPalindrome(s):\n    # Write your solution here\n    pass',
      java: 'public class Solution {\n    public boolean isPalindrome(String s) {\n        // Write your solution here\n        return false;\n    }\n}'
    }),
    test_cases: JSON.stringify([
      { input: '"A man, a plan, a canal: Panama"', expected_output: 'true' },
      { input: '"race a car"', expected_output: 'false' },
      { input: '" "', expected_output: 'true' }
    ]),
    constraints: '1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.'
  },
  {
    id: 'q_longest_substring',
    title: 'Longest Substring Without Repeating Characters',
    description: 'Given a string s, find the length of the longest substring without repeating characters.\n\nExample:\nInput: s = "abcabcbb"\nOutput: 3\nExplanation: The answer is "abc", with the length of 3.',
    difficulty: 'medium' as const,
    boilerplate: JSON.stringify({
      javascript: 'function lengthOfLongestSubstring(s) {\n    // Write your solution here\n    \n}',
      python: 'def lengthOfLongestSubstring(s):\n    # Write your solution here\n    pass',
      java: 'public class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Write your solution here\n        return 0;\n    }\n}'
    }),
    test_cases: JSON.stringify([
      { input: '"abcabcbb"', expected_output: '3' },
      { input: '"bbbbb"', expected_output: '1' },
      { input: '"pwwkew"', expected_output: '3' }
    ]),
    constraints: '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.'
  },
  {
    id: 'q_reverse_linked_list',
    title: 'Reverse Linked List',
    description: 'Given the head of a singly linked list, reverse the list and return the reversed list.\n\nExample:\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n\nThink about using two pointers — prev and current.',
    difficulty: 'easy' as const,
    boilerplate: JSON.stringify({
      javascript: 'function reverseList(head) {\n    // Write your solution here\n    let prev = null;\n    let curr = head;\n    // complete the logic\n    \n}',
      python: 'def reverseList(head):\n    # Write your solution here\n    prev = None\n    curr = head\n    # complete the logic\n    pass',
      java: 'public class Solution {\n    public ListNode reverseList(ListNode head) {\n        // Write your solution here\n        return null;\n    }\n}'
    }),
    test_cases: JSON.stringify([
      { input: '[1,2,3,4,5]', expected_output: '[5,4,3,2,1]' },
      { input: '[1,2]', expected_output: '[2,1]' },
      { input: '[]', expected_output: '[]' }
    ]),
    constraints: 'The number of nodes in the list is in the range [0, 5000].\n-5000 <= Node.val <= 5000'
  },
  {
    id: 'q_max_depth_tree',
    title: 'Maximum Depth of Binary Tree',
    description: 'Given the root of a binary tree, return its maximum depth.\n\nThe maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.\n\nExample:\nInput: root = [3,9,20,null,null,15,7]\nOutput: 3',
    difficulty: 'easy' as const,
    boilerplate: JSON.stringify({
      javascript: 'function maxDepth(root) {\n    // Write your solution here\n    // Hint: Use recursion\n    \n}',
      python: 'def maxDepth(root):\n    # Write your solution here\n    # Hint: Use recursion\n    pass',
      java: 'public class Solution {\n    public int maxDepth(TreeNode root) {\n        // Write your solution here\n        return 0;\n    }\n}'
    }),
    test_cases: JSON.stringify([
      { input: '[3,9,20,null,null,15,7]', expected_output: '3' },
      { input: '[1,null,2]', expected_output: '2' },
      { input: '[]', expected_output: '0' }
    ]),
    constraints: 'The number of nodes in the tree is in the range [0, 10^4].\n-100 <= Node.val <= 100'
  },
  {
    id: 'q_climbing_stairs',
    title: 'Climbing Stairs',
    description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?\n\nExample:\nInput: n = 3\nOutput: 3\nExplanation: 1+1+1, 1+2, 2+1\n\nHint: This is similar to Fibonacci!',
    difficulty: 'easy' as const,
    boilerplate: JSON.stringify({
      javascript: 'function climbStairs(n) {\n    // Write your solution here\n    // Hint: dp[i] = dp[i-1] + dp[i-2]\n    \n}',
      python: 'def climbStairs(n):\n    # Write your solution here\n    # Hint: dp[i] = dp[i-1] + dp[i-2]\n    pass',
      java: 'public class Solution {\n    public int climbStairs(int n) {\n        // Write your solution here\n        return 0;\n    }\n}'
    }),
    test_cases: JSON.stringify([
      { input: '2', expected_output: '2' },
      { input: '3', expected_output: '3' },
      { input: '5', expected_output: '8' }
    ]),
    constraints: '1 <= n <= 45'
  },
  {
    id: 'q_container_water',
    title: 'Container With Most Water',
    description: 'You are given an integer array height of length n representing n vertical lines. Find two lines that form a container holding the most water.\n\nExample:\nInput: height = [1,8,6,2,5,4,8,3,7]\nOutput: 49\n\nUse two pointers for an O(n) solution.',
    difficulty: 'medium' as const,
    boilerplate: JSON.stringify({
      javascript: 'function maxArea(height) {\n    // Write your solution here\n    let left = 0, right = height.length - 1;\n    // two-pointer approach\n    \n}',
      python: 'def maxArea(height):\n    # Write your solution here\n    left, right = 0, len(height) - 1\n    # two-pointer approach\n    pass',
      java: 'public class Solution {\n    public int maxArea(int[] height) {\n        // Write your solution here\n        return 0;\n    }\n}'
    }),
    test_cases: JSON.stringify([
      { input: '[1,8,6,2,5,4,8,3,7]', expected_output: '49' },
      { input: '[1,1]', expected_output: '1' }
    ]),
    constraints: 'n == height.length\n2 <= n <= 10^5\n0 <= height[i] <= 10^4'
  },
];

// Mock test MCQ bank
export const mockTestQuestionsBank = [
  { id: 'mq_001', text: 'Which data structure uses LIFO (Last In First Out)?', options: ['Queue', 'Stack', 'Linked List', 'Array'], correctAnswer: 1, difficulty: 'easy', type: 'mcq', explanation: 'A stack is a linear data structure that follows the LIFO principle — the last element added is the first one removed.' },
  { id: 'mq_002', text: 'What is the time complexity of binary search in an array of size n?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'], correctAnswer: 2, difficulty: 'medium', type: 'mcq', explanation: 'Binary search divides the search space in half at each step, resulting in O(log n) time complexity.' },
  { id: 'mq_003', text: 'In SQL, which clause is used to filter records after aggregation?', options: ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'], correctAnswer: 1, difficulty: 'medium', type: 'mcq', explanation: 'HAVING is used to filter records after GROUP BY aggregation, whereas WHERE filters before aggregation.' },
  { id: 'mq_004', text: 'Which sorting algorithm has the worst-case time complexity of O(n^2)?', options: ['Merge Sort', 'Heap Sort', 'Quick Sort', 'Radix Sort'], correctAnswer: 2, difficulty: 'hard', type: 'mcq', explanation: 'Quick Sort has an average time complexity of O(n log n), but its worst-case is O(n^2) when the pivot is chosen poorly.' },
  { id: 'mq_005', text: 'What does ACID stand for in database systems?', options: ['Atomicity, Consistency, Isolation, Durability', 'Accuracy, Completeness, Integrity, Durability', 'Atomicity, Concurrency, Isolation, Durability', 'Automatic, Consistent, Isolated, Distributed'], correctAnswer: 0, difficulty: 'easy', type: 'mcq', explanation: 'ACID properties ensure reliable processing of database transactions.' },
  { id: 'mq_006', text: 'Which machine learning algorithm is based on Bayes theorem?', options: ['Random Forest', 'Support Vector Machine', 'Naive Bayes', 'K-Means'], correctAnswer: 2, difficulty: 'easy', type: 'mcq', explanation: 'Naive Bayes classifiers apply Bayes theorem with a "naive" assumption of independence between features.' },
  { id: 'mq_007', text: 'What is the main advantage of a hash table over a binary search tree?', options: ['Faster worst-case insertion time', 'Ordered iteration of elements', 'Faster average-case lookup time', 'Smaller memory footprint'], correctAnswer: 2, difficulty: 'medium', type: 'mcq', explanation: 'Hash tables offer O(1) average-case lookup, insertion, and deletion, which is faster than the O(log n) of BSTs.' },
];

export const mockTestBank = [
  {
    id: 'mtb_001',
    title: 'Weekly Automated Mock Test',
    description: 'A dynamically generated weekly mock test covering general computer science and data science fundamentals.',
    duration: 60,
    category: 'Intermediate',
    totalQuestions: 7,
    isActive: 1
  }
];
