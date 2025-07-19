# Finish work on an Issue
## 1. Preparation
* commit all the work to current branch
* Read in $ARGUMENTS from the @ProjectMgmt/wip directory
* if not in the @ProjectMgmt/wip directory, give me feedback and end

## 2. Update the state of the Issue
* compare current branch with develop branch by using git
* mark tasks or subtasks to their proper status by checking the []:
  - [ ] not touched (open)
  - [⚒] work in progress (wip)
  - [✓] done (closed)
* In the issue description you will find a product requirement definition (PRD). 
  Create or update it by comparing or inferring from the real implementation.

## 3. Finish work on an Issue
* move it from @ProjectMgmt/wip to @ProjectMgmt/closed
* commit that move
* merge the current branch to develop
* verify that the merge worked out well by running the unit tests
* push the changes to the remote repository
* delete the current branch
* give me feedback that you finished the work on the issue