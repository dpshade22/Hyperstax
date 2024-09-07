local json = require("json")

print("WordStack Handlers Script started")

-- Initialize the data storage table
local userdata = {}

-- Handler to add a wallet address
Handlers.add('AddWalletAddress',
    Handlers.utils.hasMatchingTag('Action', 'AddWalletAddress'),
    function(msg)
        print("AddWalletAddress handler called")
        local walletAddress = msg.Tags["Wallet-Address"]
        if not walletAddress then
            print("Error: Missing Wallet-Address")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "AddWalletAddress" },
                Data = json.encode({ error = "Missing Wallet-Address" })
            })
            return
        end

        -- Store the wallet address in the table
        if not userdata[walletAddress] then
            userdata[walletAddress] = { username = nil, maxScore = 0 }
        end

        print("Wallet address added: " .. walletAddress)
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "AddWalletAddress" },
            Data = json.encode({ success = true, walletAddress = walletAddress })
        })
    end
)

-- Handler to add a username for a wallet
Handlers.add('AddUsername',
    Handlers.utils.hasMatchingTag('Action', 'AddUsername'),
    function(msg)
        print("AddUsername handler called")
        local walletAddress = msg.Tags["Wallet-Address"]
        local username = msg.Tags["Username"]
        if not walletAddress or not username then
            print("Error: Missing Wallet-Address or Username")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "AddUsername" },
                Data = json.encode({ error = "Missing Wallet-Address or Username" })
            })
            return
        end

        -- Store the username for the wallet in the table
        if not userdata[walletAddress] then
            userdata[walletAddress] = { username = username, maxScore = 0 }
        else
            userdata[walletAddress].username = username
        end

        print("Username added: " .. username .. " for wallet: " .. walletAddress)
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "AddUsername" },
            Data = json.encode({ success = true, walletAddress = walletAddress, username = username })
        })
    end
)

-- Handler to update max score for a wallet
Handlers.add('UpdateMaxScore',
    Handlers.utils.hasMatchingTag('Action', 'UpdateMaxScore'),
    function(msg)
        print("UpdateMaxScore handler called")
        local walletAddress = msg.Tags["Wallet-Address"]
        local score = tonumber(msg.Tags["Score"])
        if not walletAddress or not score then
            print("Error: Missing Wallet-Address or Score")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "UpdateMaxScore" },
                Data = json.encode({ error = "Missing Wallet-Address or Score" })
            })
            return
        end

        -- Update the max score for the wallet in the table
        if not userdata[walletAddress] then
            userdata[walletAddress] = { username = nil, maxScore = score }
        elseif score > userdata[walletAddress].maxScore then
            userdata[walletAddress].maxScore = score
        end

        print("Max score updated: " .. score .. " for wallet: " .. walletAddress)
        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "UpdateMaxScore" },
            Data = json.encode({ success = true, walletAddress = walletAddress, maxScore = score })
        })
    end
)

-- Handler to get user data (username and max score)
Handlers.add('GetUserData',
    Handlers.utils.hasMatchingTag('Action', 'GetUserData'),
    function(msg)
        print("GetUserData handler called")
        local walletAddress = msg.Tags["Wallet-Address"]
        if not walletAddress then
            print("Error: Missing Wallet-Address")
            ao.send({
                Target = msg.From,
                Action = "Response",
                Tags = { ["Action"] = "GetUserData" },
                Data = json.encode({ error = "Missing Wallet-Address" })
            })
            return
        end

        -- Retrieve user data from the table
        local userData = userdata[walletAddress] or { username = "Unknown", maxScore = 0 }

        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "GetUserData" },
            Data = json.encode({
                walletAddress = walletAddress,
                username = userData.username,
                maxScore = userData.maxScore
            })
        })

        print("User data retrieved for wallet: " .. walletAddress)
    end
)

-- Handler to get the leaderboard
Handlers.add('GetLeaderboard',
    Handlers.utils.hasMatchingTag('Action', 'GetLeaderboard'),
    function(msg)
        print("GetLeaderboard handler called")
        local limit = tonumber(msg.Tags["Limit"]) or 10  -- Default to top 10 if not specified

        -- Create a list of all users with their scores
        local leaderboard = {}
        for wallet, data in pairs(userdata) do
            table.insert(leaderboard, {
                walletAddress = wallet,
                username = data.username or "Unknown",
                maxScore = data.maxScore
            })
        end

        -- Sort the leaderboard by maxScore in descending order
        table.sort(leaderboard, function(a, b) return a.maxScore > b.maxScore end)

        -- Limit the results
        if #leaderboard > limit then
            for i = limit + 1, #leaderboard do
                leaderboard[i] = nil
            end
        end

        ao.send({
            Target = msg.From,
            Action = "Response",
            Tags = { ["Action"] = "GetLeaderboard" },
            Data = json.encode({
                success = true,
                leaderboard = leaderboard
            })
        })

        print("Leaderboard retrieved, entries: " .. #leaderboard)
    end
)

print("WordStack Handlers Script completed")
