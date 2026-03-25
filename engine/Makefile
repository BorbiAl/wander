CXX := g++
CXXFLAGS := -std=c++17 -O2 -Iinclude
ifeq ($(OS),Windows_NT)
# cpp-httplib on Windows requires Windows 10 APIs and Winsock symbols.
CXXFLAGS += -DWINVER=0x0A00 -D_WIN32_WINNT=0x0A00
LDFLAGS := -lws2_32
else
LDFLAGS := -lpthread
endif
TARGET := wandergraph
SOURCES := src/*.cpp

all:
	$(CXX) $(CXXFLAGS) $(SOURCES) $(LDFLAGS) -o $(TARGET)

clean:
	rm -f $(TARGET)

.PHONY: all clean
