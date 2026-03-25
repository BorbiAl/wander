CXX := g++
CXXFLAGS := -std=c++17 -O2 -Iinclude
ifeq ($(OS),Windows_NT)
# This MinGW toolchain does not provide pthread libraries by default.
LDFLAGS :=
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
